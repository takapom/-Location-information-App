drop policy if exists "friendships_update_participant" on public.friendships;
drop policy if exists "friendships_insert_requester" on public.friendships;

create or replace function public.list_incoming_friend_requests()
returns table (
  friendship_id uuid,
  requester_user_id uuid,
  friend_code text,
  display_name text,
  avatar_url text,
  territory_color text,
  total_area_m2 double precision,
  requested_at timestamptz
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
  select
    fs.id,
    fs.requester_user_id,
    p.friend_code,
    p.display_name,
    p.avatar_url,
    p.territory_color,
    coalesce(sum(da.area_m2), 0)::double precision as total_area_m2,
    fs.created_at
  from public.friendships fs
  join public.profiles p
    on p.id = fs.requester_user_id
  left join public.daily_activities da
    on da.user_id = p.id
  where fs.receiver_user_id = v_user_id
    and fs.status = 'pending'
  group by fs.id, fs.requester_user_id, p.friend_code, p.display_name, p.avatar_url, p.territory_color, fs.created_at
  order by fs.created_at desc;
end;
$$;

create or replace function public.list_outgoing_friend_requests()
returns table (
  friendship_id uuid,
  receiver_user_id uuid,
  friend_code text,
  display_name text,
  avatar_url text,
  territory_color text,
  total_area_m2 double precision,
  requested_at timestamptz
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
  select
    fs.id,
    fs.receiver_user_id,
    p.friend_code,
    p.display_name,
    p.avatar_url,
    p.territory_color,
    coalesce(sum(da.area_m2), 0)::double precision as total_area_m2,
    fs.created_at
  from public.friendships fs
  join public.profiles p
    on p.id = fs.receiver_user_id
  left join public.daily_activities da
    on da.user_id = p.id
  where fs.requester_user_id = v_user_id
    and fs.status = 'pending'
  group by fs.id, fs.receiver_user_id, p.friend_code, p.display_name, p.avatar_url, p.territory_color, fs.created_at
  order by fs.created_at desc;
end;
$$;

create or replace function public.list_accepted_friends()
returns table (
  friend_user_id uuid,
  friend_code text,
  display_name text,
  avatar_url text,
  territory_color text,
  location_sharing_enabled boolean,
  total_area_m2 double precision,
  accepted_at timestamptz
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
  select
    friend_profile.id,
    friend_profile.friend_code,
    friend_profile.display_name,
    friend_profile.avatar_url,
    friend_profile.territory_color,
    friend_profile.location_sharing_enabled,
    coalesce(sum(da.area_m2), 0)::double precision as total_area_m2,
    fs.updated_at
  from public.friendships fs
  join public.profiles friend_profile
    on friend_profile.id = case
      when fs.requester_user_id = v_user_id then fs.receiver_user_id
      else fs.requester_user_id
    end
  left join public.daily_activities da
    on da.user_id = friend_profile.id
  where fs.status = 'accepted'
    and (fs.requester_user_id = v_user_id or fs.receiver_user_id = v_user_id)
  group by friend_profile.id, friend_profile.friend_code, friend_profile.display_name, friend_profile.avatar_url, friend_profile.territory_color, friend_profile.location_sharing_enabled, fs.updated_at
  order by fs.updated_at desc;
end;
$$;

create or replace function public.respond_friend_request(p_friendship_id uuid, p_action text)
returns table (
  friendship_id uuid,
  requester_user_id uuid,
  receiver_user_id uuid,
  action text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_action text := lower(trim(coalesce(p_action, '')));
  v_friendship public.friendships%rowtype;
begin
  if v_user_id is null then
    raise exception 'auth required' using errcode = '28000';
  end if;

  if v_action not in ('accept', 'reject') then
    raise exception 'invalid friend request action' using errcode = '22023';
  end if;

  select *
    into v_friendship
  from public.friendships
  where id = p_friendship_id
    and receiver_user_id = v_user_id
    and status = 'pending'
  for update;

  if not found then
    raise exception 'friend request not found or not actionable' using errcode = 'P0002';
  end if;

  if v_action = 'accept' then
    update public.friendships
      set status = 'accepted',
          updated_at = now()
    where id = v_friendship.id
    returning * into v_friendship;

    friendship_id := v_friendship.id;
    requester_user_id := v_friendship.requester_user_id;
    receiver_user_id := v_friendship.receiver_user_id;
    action := 'accept';
    status := 'accepted';
    return next;
    return;
  end if;

  delete from public.friendships
  where id = v_friendship.id;

  friendship_id := v_friendship.id;
  requester_user_id := v_friendship.requester_user_id;
  receiver_user_id := v_friendship.receiver_user_id;
  action := 'reject';
  status := 'rejected';
  return next;
end;
$$;

revoke all on function public.list_incoming_friend_requests() from public;
revoke all on function public.list_outgoing_friend_requests() from public;
revoke all on function public.list_accepted_friends() from public;
revoke all on function public.respond_friend_request(uuid, text) from public;
grant execute on function public.list_incoming_friend_requests() to authenticated;
grant execute on function public.list_outgoing_friend_requests() to authenticated;
grant execute on function public.list_accepted_friends() to authenticated;
grant execute on function public.respond_friend_request(uuid, text) to authenticated;
