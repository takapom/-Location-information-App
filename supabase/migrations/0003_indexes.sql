create index daily_activities_user_date_idx
  on public.daily_activities (user_id, local_date desc);

create index location_points_daily_recorded_at_idx
  on public.location_points (daily_activity_id, recorded_at);

create index location_points_user_recorded_at_idx
  on public.location_points (user_id, recorded_at desc);

create index location_points_position_gix
  on public.location_points using gist (position);

create index territories_user_state_idx
  on public.territories (user_id, state, calculated_at desc);

create index territories_polygon_gix
  on public.territories using gist (polygon);

create index friendships_requester_status_idx
  on public.friendships (requester_user_id, status);

create index friendships_receiver_status_idx
  on public.friendships (receiver_user_id, status);
