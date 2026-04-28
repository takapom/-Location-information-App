create or replace function public.list_friend_territories()
returns table (
  territory_id uuid,
  friend_user_id uuid,
  display_name text,
  territory_color text,
  area_m2 double precision,
  calculated_at timestamptz,
  polygon_geojson jsonb
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
  with accepted_friends as (
    select distinct
      case
        when fs.requester_user_id = v_user_id then fs.receiver_user_id
        else fs.requester_user_id
      end as friend_user_id
    from public.friendships fs
    where fs.status = 'accepted'
      and (fs.requester_user_id = v_user_id or fs.receiver_user_id = v_user_id)
  )
  select
    t.id,
    p.id,
    p.display_name,
    p.territory_color,
    t.area_m2,
    t.calculated_at,
    ST_AsGeoJSON(coalesce(t.simplified_polygon, t.polygon))::jsonb as polygon_geojson
  from accepted_friends af
  join public.territories t
    on t.user_id = af.friend_user_id
   and t.state = 'final'
   and t.user_id <> v_user_id
  join public.profiles p
    on p.id = af.friend_user_id
  order by t.calculated_at desc, t.id asc;
end;
$$;

revoke all on function public.list_friend_territories() from public;
grant execute on function public.list_friend_territories() to authenticated;
