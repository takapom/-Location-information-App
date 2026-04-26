create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  territory_color text not null default '#F07060',
  emoji_status text,
  location_sharing_enabled boolean not null default true,
  territory_capture_enabled boolean not null default true,
  background_tracking_enabled boolean not null default false,
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.daily_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  local_date date not null,
  timezone text not null,
  status text not null default 'open' check (status in ('open', 'finalized', 'paused')),
  started_at timestamptz,
  ended_at timestamptz,
  distance_m double precision not null default 0,
  area_m2 double precision not null default 0,
  point_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_date)
);

create table public.location_points (
  id uuid primary key default gen_random_uuid(),
  daily_activity_id uuid not null references public.daily_activities(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  position geography(point, 4326) not null,
  accuracy_m double precision,
  speed_mps double precision,
  recorded_at timestamptz not null,
  accepted_for_geometry boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.territories (
  id uuid primary key default gen_random_uuid(),
  daily_activity_id uuid not null references public.daily_activities(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  polygon geometry(multipolygon, 4326) not null,
  simplified_polygon geometry(multipolygon, 4326),
  area_m2 double precision not null,
  algorithm_version text not null,
  state text not null check (state in ('live', 'final')),
  calculated_at timestamptz not null default now(),
  unique (daily_activity_id, state)
);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references public.profiles(id) on delete cascade,
  receiver_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_user_id, receiver_user_id),
  check (requester_user_id <> receiver_user_id)
);
