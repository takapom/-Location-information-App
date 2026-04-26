alter table public.profiles enable row level security;
alter table public.daily_activities enable row level security;
alter table public.location_points enable row level security;
alter table public.territories enable row level security;
alter table public.friendships enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "daily_activities_select_own"
  on public.daily_activities for select
  using (user_id = auth.uid());

create policy "daily_activities_insert_own"
  on public.daily_activities for insert
  with check (user_id = auth.uid());

create policy "daily_activities_update_own"
  on public.daily_activities for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "location_points_select_own"
  on public.location_points for select
  using (user_id = auth.uid());

create policy "location_points_insert_own_daily_activity"
  on public.location_points for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.daily_activities da
      where da.id = daily_activity_id
        and da.user_id = auth.uid()
        and da.status in ('open', 'paused')
    )
  );

create policy "territories_select_own"
  on public.territories for select
  using (user_id = auth.uid());

create policy "territories_insert_own"
  on public.territories for insert
  with check (user_id = auth.uid());

create policy "territories_update_own"
  on public.territories for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "friendships_select_participant"
  on public.friendships for select
  using (requester_user_id = auth.uid() or receiver_user_id = auth.uid());

create policy "friendships_insert_requester"
  on public.friendships for insert
  with check (requester_user_id = auth.uid());

create policy "friendships_update_participant"
  on public.friendships for update
  using (requester_user_id = auth.uid() or receiver_user_id = auth.uid())
  with check (requester_user_id = auth.uid() or receiver_user_id = auth.uid());
