create or replace function public.sync_live_territory(p_daily_activity_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_daily public.daily_activities%rowtype;
  v_valid_point_count integer;
  v_distance_m double precision := 0;
  v_area_m2 double precision := 0;
  v_line geometry(linestring, 4326);
  v_polygon geometry(multipolygon, 4326);
  v_simplified geometry(multipolygon, 4326);
  v_territory_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select *
    into v_daily
  from public.daily_activities
  where id = p_daily_activity_id
    and user_id = v_user_id
    and status in ('open', 'paused')
  for update;

  if not found then
    raise exception 'daily activity not found or not syncable' using errcode = 'P0002';
  end if;

  with ordered_points as (
    select
      position,
      recorded_at,
      lag(position) over (order by recorded_at) as previous_position,
      lag(recorded_at) over (order by recorded_at) as previous_recorded_at
    from public.location_points
    where daily_activity_id = p_daily_activity_id
      and user_id = v_user_id
      and coalesce(accuracy_m, 0) < 50
      and (speed_mps is null or speed_mps <= 15)
      and accepted_for_geometry = true
  ),
  valid_points as (
    select *
    from ordered_points
    where previous_position is null
      or (
        ST_Distance(position, previous_position) >= 1
        and previous_recorded_at is not null
        and extract(epoch from recorded_at - previous_recorded_at) > 0
        and ST_Distance(position, previous_position) <= greatest(
          100.0,
          extract(epoch from recorded_at - previous_recorded_at)::double precision * 15.0
        )
      )
  )
  select count(*)
    into v_valid_point_count
  from valid_points;

  with ordered_points as (
    select
      position,
      recorded_at,
      lag(position) over (order by recorded_at) as previous_position,
      lag(recorded_at) over (order by recorded_at) as previous_recorded_at
    from public.location_points
    where daily_activity_id = p_daily_activity_id
      and user_id = v_user_id
      and coalesce(accuracy_m, 0) < 50
      and (speed_mps is null or speed_mps <= 15)
      and accepted_for_geometry = true
  ),
  valid_points as (
    select *
    from ordered_points
    where previous_position is null
      or (
        ST_Distance(position, previous_position) >= 1
        and previous_recorded_at is not null
        and extract(epoch from recorded_at - previous_recorded_at) > 0
        and ST_Distance(position, previous_position) <= greatest(
          100.0,
          extract(epoch from recorded_at - previous_recorded_at)::double precision * 15.0
        )
      )
  )
  select coalesce(sum(ST_Distance(position, previous_position)), 0)
    into v_distance_m
  from valid_points
  where previous_position is not null;

  if v_valid_point_count >= 2 then
    with ordered_points as (
      select
        position,
        recorded_at,
        lag(position) over (order by recorded_at) as previous_position,
        lag(recorded_at) over (order by recorded_at) as previous_recorded_at
      from public.location_points
      where daily_activity_id = p_daily_activity_id
        and user_id = v_user_id
        and coalesce(accuracy_m, 0) < 50
        and (speed_mps is null or speed_mps <= 15)
        and accepted_for_geometry = true
    ),
    valid_points as (
      select *
      from ordered_points
      where previous_position is null
        or (
          ST_Distance(position, previous_position) >= 1
          and previous_recorded_at is not null
          and extract(epoch from recorded_at - previous_recorded_at) > 0
          and ST_Distance(position, previous_position) <= greatest(
            100.0,
            extract(epoch from recorded_at - previous_recorded_at)::double precision * 15.0
          )
        )
    )
    select ST_MakeLine(position::geometry order by recorded_at)
      into v_line
    from valid_points;

    v_polygon := ST_Multi(ST_Buffer(v_line::geography, 30)::geometry);
    v_simplified := ST_Multi(ST_SimplifyPreserveTopology(v_polygon, 0.00002));
    v_area_m2 := ST_Area(v_polygon::geography);

    insert into public.territories (
      daily_activity_id,
      user_id,
      polygon,
      simplified_polygon,
      area_m2,
      algorithm_version,
      state,
      calculated_at
    )
    values (
      p_daily_activity_id,
      v_user_id,
      v_polygon,
      v_simplified,
      v_area_m2,
      'live-buffer-v1-basic',
      'live',
      now()
    )
    on conflict (daily_activity_id, state) do update
      set polygon = excluded.polygon,
          simplified_polygon = excluded.simplified_polygon,
          area_m2 = excluded.area_m2,
          algorithm_version = excluded.algorithm_version,
          calculated_at = excluded.calculated_at
    returning id into v_territory_id;
  end if;

  update public.daily_activities
    set distance_m = v_distance_m,
        area_m2 = v_area_m2,
        point_count = v_valid_point_count,
        started_at = coalesce(started_at, (
          select min(recorded_at)
          from public.location_points
          where daily_activity_id = p_daily_activity_id
        )),
        ended_at = (
          select max(recorded_at)
          from public.location_points
          where daily_activity_id = p_daily_activity_id
        ),
        updated_at = now()
  where id = p_daily_activity_id;

  return jsonb_build_object(
    'dailyActivityId', p_daily_activity_id,
    'territoryId', v_territory_id,
    'pointCount', v_valid_point_count,
    'distanceM', v_distance_m,
    'areaM2', v_area_m2,
    'state', 'live'
  );
end;
$$;

create or replace function public.finalize_daily_activity(p_daily_activity_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_daily public.daily_activities%rowtype;
  v_sync_result jsonb;
  v_live public.territories%rowtype;
  v_final public.territories%rowtype;
  v_final_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select *
    into v_daily
  from public.daily_activities
  where id = p_daily_activity_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'daily activity not found' using errcode = 'P0002';
  end if;

  if v_daily.status = 'finalized' then
    select *
      into v_final
    from public.territories
    where daily_activity_id = p_daily_activity_id
      and user_id = v_user_id
      and state = 'final';

    return jsonb_build_object(
      'dailyActivityId', p_daily_activity_id,
      'territoryId', v_final.id,
      'pointCount', v_daily.point_count,
      'distanceM', v_daily.distance_m,
      'areaM2', v_daily.area_m2,
      'state', 'final',
      'finalTerritoryId', v_final.id
    );
  end if;

  v_sync_result := public.sync_live_territory(p_daily_activity_id);

  select *
    into v_live
  from public.territories
  where daily_activity_id = p_daily_activity_id
    and user_id = v_user_id
    and state = 'live';

  if found then
    insert into public.territories (
      daily_activity_id,
      user_id,
      polygon,
      simplified_polygon,
      area_m2,
      algorithm_version,
      state,
      calculated_at
    )
    values (
      p_daily_activity_id,
      v_user_id,
      v_live.polygon,
      v_live.simplified_polygon,
      v_live.area_m2,
      'final-buffer-v1-basic',
      'final',
      now()
    )
    on conflict (daily_activity_id, state) do update
      set polygon = excluded.polygon,
          simplified_polygon = excluded.simplified_polygon,
          area_m2 = excluded.area_m2,
          algorithm_version = excluded.algorithm_version,
          calculated_at = excluded.calculated_at
    returning id into v_final_id;
  end if;

  update public.daily_activities
    set status = 'finalized',
        updated_at = now()
  where id = p_daily_activity_id
    and user_id = v_user_id;

  return v_sync_result || jsonb_build_object('state', 'final', 'finalTerritoryId', v_final_id);
end;
$$;
