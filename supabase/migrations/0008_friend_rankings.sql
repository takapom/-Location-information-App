create or replace function public.list_friend_rankings()
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  territory_color text,
  total_area_m2 double precision,
  delta_area_m2 double precision,
  rank integer,
  is_current_user boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'auth required' using errcode = '28000';
  end if;

  return query
  with visible_users as (
    select
      v_user_id as user_id,
      true as is_current_user
    union
    select
      case
        when fs.requester_user_id = v_user_id then fs.receiver_user_id
        else fs.requester_user_id
      end as user_id,
      false as is_current_user
    from public.friendships fs
    where fs.status = 'accepted'
      and (fs.requester_user_id = v_user_id or fs.receiver_user_id = v_user_id)
  ),
  totals as (
    select
      vu.user_id,
      bool_or(vu.is_current_user) as is_current_user,
      coalesce(sum(da.area_m2), 0)::double precision as total_area_m2
    from visible_users vu
    left join public.daily_activities da
      on da.user_id = vu.user_id
    group by vu.user_id
  ),
  ranked as (
    select
      p.id as user_id,
      p.display_name,
      p.avatar_url,
      p.territory_color,
      t.total_area_m2,
      0::double precision as delta_area_m2,
      dense_rank() over (order by t.total_area_m2 desc)::integer as ranking_rank,
      t.is_current_user
    from totals t
    join public.profiles p
      on p.id = t.user_id
  )
  select
    ranked.user_id,
    ranked.display_name,
    ranked.avatar_url,
    ranked.territory_color,
    ranked.total_area_m2,
    ranked.delta_area_m2,
    ranked.ranking_rank,
    ranked.is_current_user
  from ranked
  order by ranked.ranking_rank asc, ranked.display_name asc;
end;
$$;

revoke all on function public.list_friend_rankings() from public;
grant execute on function public.list_friend_rankings() to authenticated;
