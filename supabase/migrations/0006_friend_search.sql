alter table public.profiles
  add column if not exists friend_code text not null default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

create unique index if not exists profiles_friend_code_lower_key
  on public.profiles (lower(friend_code));

create index if not exists profiles_friend_code_prefix_idx
  on public.profiles (upper(friend_code));

create or replace function public.search_profiles_by_friend_code(p_query text)
returns table (
  id uuid,
  friend_code text,
  display_name text,
  avatar_url text,
  territory_color text,
  total_area_m2 double precision,
  request_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_query text := upper(trim(coalesce(p_query, '')));
begin
  if v_user_id is null then
    raise exception 'auth required' using errcode = '28000';
  end if;

  if length(v_query) < 2 then
    return;
  end if;

  return query
  select
    p.id,
    p.friend_code,
    p.display_name,
    p.avatar_url,
    p.territory_color,
    coalesce(sum(da.area_m2), 0)::double precision as total_area_m2,
    case
      when f.status = 'accepted' then 'accepted'
      when f.status = 'pending' then 'pending'
      else 'none'
    end as request_status
  from public.profiles p
  left join public.daily_activities da
    on da.user_id = p.id
  left join lateral (
    select fs.status
    from public.friendships fs
    where (fs.requester_user_id = v_user_id and fs.receiver_user_id = p.id)
       or (fs.requester_user_id = p.id and fs.receiver_user_id = v_user_id)
    order by fs.updated_at desc
    limit 1
  ) f on true
  where p.id <> v_user_id
    and coalesce(f.status, 'none') <> 'blocked'
    and (
      upper(p.friend_code) like v_query || '%'
      or upper(p.display_name) like '%' || v_query || '%'
    )
  group by p.id, p.friend_code, p.display_name, p.avatar_url, p.territory_color, f.status
  order by
    (upper(p.friend_code) = v_query) desc,
    (upper(p.friend_code) like v_query || '%') desc,
    p.display_name asc
  limit 10;
end;
$$;

create or replace function public.request_friend_by_code(p_friend_code text)
returns table (
  friendship_id uuid,
  receiver_user_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester_id uuid := auth.uid();
  v_receiver_id uuid;
  v_existing public.friendships%rowtype;
  v_inserted public.friendships%rowtype;
begin
  if v_requester_id is null then
    raise exception 'auth required' using errcode = '28000';
  end if;

  select p.id
    into v_receiver_id
  from public.profiles p
  where lower(p.friend_code) = lower(trim(coalesce(p_friend_code, '')))
  limit 1;

  if v_receiver_id is null then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if v_receiver_id = v_requester_id then
    raise exception 'cannot request yourself' using errcode = '22023';
  end if;

  select fs.*
    into v_existing
  from public.friendships fs
  where (fs.requester_user_id = v_requester_id and fs.receiver_user_id = v_receiver_id)
     or (fs.requester_user_id = v_receiver_id and fs.receiver_user_id = v_requester_id)
  order by fs.updated_at desc
  limit 1;

  if v_existing.id is not null then
    if v_existing.status = 'blocked' then
      raise exception 'friendship blocked' using errcode = '42501';
    end if;

    friendship_id := v_existing.id;
    receiver_user_id := v_receiver_id;
    status := v_existing.status;
    return next;
    return;
  end if;

  insert into public.friendships (requester_user_id, receiver_user_id, status)
  values (v_requester_id, v_receiver_id, 'pending')
  returning * into v_inserted;

  friendship_id := v_inserted.id;
  receiver_user_id := v_receiver_id;
  status := v_inserted.status;
  return next;
end;
$$;

revoke all on function public.search_profiles_by_friend_code(text) from public;
revoke all on function public.request_friend_by_code(text) from public;
grant execute on function public.search_profiles_by_friend_code(text) to authenticated;
grant execute on function public.request_friend_by_code(text) to authenticated;
