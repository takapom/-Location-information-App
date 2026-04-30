create or replace function public.presence_topic_user_id(p_topic text)
returns uuid
language plpgsql
immutable
as $$
declare
  v_user_id_text text;
begin
  if p_topic !~ '^presence:user:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;

  v_user_id_text := split_part(p_topic, ':', 3);
  return v_user_id_text::uuid;
exception
  when others then
    return null;
end;
$$;

create or replace function public.can_access_friend_presence_topic(p_topic text)
returns boolean
language sql
security definer
set search_path = public
as $$
  with target as (
    select public.presence_topic_user_id(p_topic) as user_id
  )
  select
    auth.uid() is not null
    and target.user_id is not null
    and exists (
      select 1
      from public.profiles target_profile
      where target_profile.id = target.user_id
        and target_profile.location_sharing_enabled
    )
    and (
      target.user_id = auth.uid()
      or exists (
        select 1
        from public.friendships fs
        where fs.status = 'accepted'
          and (
            (fs.requester_user_id = auth.uid() and fs.receiver_user_id = target.user_id)
            or (fs.receiver_user_id = auth.uid() and fs.requester_user_id = target.user_id)
          )
      )
    )
  from target;
$$;

create or replace function public.can_track_friend_presence_topic(p_topic text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and public.presence_topic_user_id(p_topic) = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.location_sharing_enabled
    );
$$;

alter table realtime.messages enable row level security;

drop policy if exists "friend_presence_read_accepted_or_self" on realtime.messages;
drop policy if exists "friend_presence_track_self" on realtime.messages;

create policy "friend_presence_read_accepted_or_self"
  on realtime.messages
  for select
  to authenticated
  using (
    public.can_access_friend_presence_topic(realtime.topic())
  );

create policy "friend_presence_track_self"
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension = 'presence'
    and public.can_track_friend_presence_topic(realtime.topic())
  );

revoke all on function public.presence_topic_user_id(text) from public;
revoke all on function public.can_access_friend_presence_topic(text) from public;
revoke all on function public.can_track_friend_presence_topic(text) from public;
grant execute on function public.presence_topic_user_id(text) to authenticated;
grant execute on function public.can_access_friend_presence_topic(text) to authenticated;
grant execute on function public.can_track_friend_presence_topic(text) to authenticated;
