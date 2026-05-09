drop policy if exists "territories_delete_own" on public.territories;
drop policy if exists "daily_activities_insert_own" on public.daily_activities;
drop policy if exists "location_points_insert_own_daily_activity" on public.location_points;

create policy "daily_activities_insert_own"
  on public.daily_activities for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.territory_capture_enabled = true
    )
  );

create policy "location_points_insert_own_daily_activity"
  on public.location_points for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.territory_capture_enabled = true
    )
    and exists (
      select 1
      from public.daily_activities da
      where da.id = daily_activity_id
        and da.user_id = auth.uid()
        and da.status in ('open', 'paused')
    )
  );

create policy "territories_delete_own"
  on public.territories for delete
  using (user_id = auth.uid());

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

  with recursive raw_points as (
    select
      row_number() over (order by recorded_at, id) as rn,
      position,
      recorded_at
    from public.location_points
    where daily_activity_id = p_daily_activity_id
      and user_id = v_user_id
      and coalesce(accuracy_m, 0) < 50
      and (speed_mps is null or speed_mps <= 15)
      and accepted_for_geometry = true
  ),
  scanned_points (
    rn,
    position,
    recorded_at,
    previous_position,
    previous_recorded_at,
    accepted,
    last_accepted_position,
    last_accepted_recorded_at
  ) as (
    select
      rn,
      position,
      recorded_at,
      null::geography,
      null::timestamptz,
      true,
      position,
      recorded_at
    from raw_points
    where rn = 1

    union all

    select
      next_point.rn,
      next_point.position,
      next_point.recorded_at,
      scanned_points.last_accepted_position,
      scanned_points.last_accepted_recorded_at,
      (
        ST_Distance(next_point.position, scanned_points.last_accepted_position) >= 1
        and extract(epoch from next_point.recorded_at - scanned_points.last_accepted_recorded_at) > 0
        and ST_Distance(next_point.position, scanned_points.last_accepted_position) <= greatest(
          100.0,
          extract(epoch from next_point.recorded_at - scanned_points.last_accepted_recorded_at)::double precision * 15.0
        )
      ),
      case
        when (
          ST_Distance(next_point.position, scanned_points.last_accepted_position) >= 1
          and extract(epoch from next_point.recorded_at - scanned_points.last_accepted_recorded_at) > 0
          and ST_Distance(next_point.position, scanned_points.last_accepted_position) <= greatest(
            100.0,
            extract(epoch from next_point.recorded_at - scanned_points.last_accepted_recorded_at)::double precision * 15.0
          )
        ) then next_point.position
        else scanned_points.last_accepted_position
      end,
      case
        when (
          ST_Distance(next_point.position, scanned_points.last_accepted_position) >= 1
          and extract(epoch from next_point.recorded_at - scanned_points.last_accepted_recorded_at) > 0
          and ST_Distance(next_point.position, scanned_points.last_accepted_position) <= greatest(
            100.0,
            extract(epoch from next_point.recorded_at - scanned_points.last_accepted_recorded_at)::double precision * 15.0
          )
        ) then next_point.recorded_at
        else scanned_points.last_accepted_recorded_at
      end
    from scanned_points
    join raw_points next_point
      on next_point.rn = scanned_points.rn + 1
  ),
  valid_points as (
    select rn, position, recorded_at, previous_position, previous_recorded_at
    from scanned_points
    where accepted
  )
  select count(*)
    into v_valid_point_count
  from valid_points;

  with recursive raw_points as (
    select
      row_number() over (order by recorded_at, id) as rn,
      position,
      recorded_at
    from public.location_points
    where daily_activity_id = p_daily_activity_id
      and user_id = v_user_id
      and coalesce(accuracy_m, 0) < 50
      and (speed_mps is null or speed_mps <= 15)
      and accepted_for_geometry = true
  ),
  scanned_points (
    rn,
    position,
    recorded_at,
    previous_position,
    previous_recorded_at,
    accepted,
    last_accepted_position,
    last_accepted_recorded_at
  ) as (
    select
      rn,
      position,
      recorded_at,
      null::geography,
      null::timestamptz,
      true,
      position,
      recorded_at
    from raw_points
    where rn = 1

    union all

    select
      next_point.rn,
      next_point.position,
      next_point.recorded_at,
      scanned_points.last_accepted_position,
      scanned_points.last_accepted_recorded_at,
      (
        ST_Distance(next_point.position, scanned_points.last_accepted_position) >= 1
        and extract(epoch from next_point.recorded_at - scanned_points.last_accepted_recorded_at) > 0
        and ST_Distance(next_point.position, scanned_points.last_accepted_position) <= greatest(
          100.0,
          extract(epoch from next_point.recorded_at - scanned_points.last_accepted_recorded_at)::double precision * 15.0
        )
      ),
      case
        when (
          ST_Distance(next_point.position, scanned_points.last_accepted_position) >= 1
          and extract(epoch from next_point.recorded_at - scanned_points.last_accepted_recorded_at) > 0
          and ST_Distance(next_point.position, scanned_points.last_accepted_position) <= greatest(
            100.0,
            extract(epoch from next_point.recorded_at - scanned_points.last_accepted_recorded_at)::double precision * 15.0
          )
        ) then next_point.position
        else scanned_points.last_accepted_position
      end,
      case
        when (
          ST_Distance(next_point.position, scanned_points.last_accepted_position) >= 1
          and extract(epoch from next_point.recorded_at - scanned_points.last_accepted_recorded_at) > 0
          and ST_Distance(next_point.position, scanned_points.last_accepted_position) <= greatest(
            100.0,
            extract(epoch from next_point.recorded_at - scanned_points.last_accepted_recorded_at)::double precision * 15.0
          )
        ) then next_point.recorded_at
        else scanned_points.last_accepted_recorded_at
      end
    from scanned_points
    join raw_points next_point
      on next_point.rn = scanned_points.rn + 1
  ),
  valid_points as (
    select rn, position, recorded_at, previous_position, previous_recorded_at
    from scanned_points
    where accepted
  )
  select coalesce(sum(ST_Distance(position, previous_position)), 0)
    into v_distance_m
  from valid_points
  where previous_position is not null;

  with recursive raw_points as (
    select
      row_number() over (order by recorded_at, id) as rn,
      position,
      recorded_at
    from public.location_points
    where daily_activity_id = p_daily_activity_id
      and user_id = v_user_id
      and coalesce(accuracy_m, 0) < 50
      and (speed_mps is null or speed_mps <= 15)
      and accepted_for_geometry = true
  ),
  scanned_points (
    rn,
    position,
    recorded_at,
    previous_position,
    previous_recorded_at,
    accepted,
    last_accepted_position,
    last_accepted_recorded_at
  ) as (
    select
      rn,
      position,
      recorded_at,
      null::geography,
      null::timestamptz,
      true,
      position,
      recorded_at
    from raw_points
    where rn = 1

    union all

    select
      next_point.rn,
      next_point.position,
      next_point.recorded_at,
      scanned_points.last_accepted_position,
      scanned_points.last_accepted_recorded_at,
      (
        ST_Distance(next_point.position, scanned_points.last_accepted_position) >= 1
        and extract(epoch from next_point.recorded_at - scanned_points.last_accepted_recorded_at) > 0
        and ST_Distance(next_point.position, scanned_points.last_accepted_position) <= greatest(
          100.0,
          extract(epoch from next_point.recorded_at - scanned_points.last_accepted_recorded_at)::double precision * 15.0
        )
      ),
      case
        when (
          ST_Distance(next_point.position, scanned_points.last_accepted_position) >= 1
          and extract(epoch from next_point.recorded_at - scanned_points.last_accepted_recorded_at) > 0
          and ST_Distance(next_point.position, scanned_points.last_accepted_position) <= greatest(
            100.0,
            extract(epoch from next_point.recorded_at - scanned_points.last_accepted_recorded_at)::double precision * 15.0
          )
        ) then next_point.position
        else scanned_points.last_accepted_position
      end,
      case
        when (
          ST_Distance(next_point.position, scanned_points.last_accepted_position) >= 1
          and extract(epoch from next_point.recorded_at - scanned_points.last_accepted_recorded_at) > 0
          and ST_Distance(next_point.position, scanned_points.last_accepted_position) <= greatest(
            100.0,
            extract(epoch from next_point.recorded_at - scanned_points.last_accepted_recorded_at)::double precision * 15.0
          )
        ) then next_point.recorded_at
        else scanned_points.last_accepted_recorded_at
      end
    from scanned_points
    join raw_points next_point
      on next_point.rn = scanned_points.rn + 1
  ),
  valid_points as (
    select rn, position, recorded_at, previous_position, previous_recorded_at
    from scanned_points
    where accepted
  ),
  route_points as (
    select
      row_number() over (order by rn) as rn,
      position,
      position::geometry as geom,
      recorded_at
    from valid_points
  ),
  candidate_pairs_raw as (
    select
      start_rn,
      end_rn,
      close_distance_m,
      lead(close_distance_m) over (partition by start_rn order by end_rn) as next_close_distance_m
    from (
      select
        a.rn as start_rn,
        b.rn as end_rn,
        ST_Distance(a.position, b.position) as close_distance_m
      from route_points a
      join route_points b
        on b.rn - a.rn >= 3
       and ST_Distance(a.position, b.position) <= 500
    ) candidates
  ),
  candidate_pairs as (
    select
      start_rn,
      end_rn,
      close_distance_m
    from candidate_pairs_raw
    where next_close_distance_m is null
      or next_close_distance_m >= close_distance_m + 25
  ),
  candidate_lines as (
    select
      cp.start_rn,
      cp.end_rn,
      ST_MakeLine(rp.geom order by rp.rn) as line
    from candidate_pairs cp
    join route_points rp
      on rp.rn between cp.start_rn and cp.end_rn
    group by cp.start_rn, cp.end_rn
  ),
  candidate_polygons as (
    select
      start_rn,
      end_rn,
      ST_Length(line::geography) as loop_distance_m,
      ST_Multi(
        ST_CollectionExtract(
          ST_MakeValid(ST_MakePolygon(ST_AddPoint(line, ST_StartPoint(line)))),
          3
        )
      )::geometry(multipolygon, 4326) as loop_polygon
    from candidate_lines
    where ST_NPoints(line) >= 4
  ),
  valid_polygons as (
    select
      start_rn,
      end_rn,
      loop_polygon,
      loop_distance_m,
      ST_Area(loop_polygon::geography) as loop_area_m2
    from candidate_polygons
    where not ST_IsEmpty(loop_polygon)
      and ST_IsValid(loop_polygon)
      and loop_distance_m >= 100
  ),
  accepted_polygons as (
    select *
    from valid_polygons current_loop
    where current_loop.loop_area_m2 >= 100
      and not exists (
        select 1
        from valid_polygons previous_loop
        where previous_loop.loop_area_m2 >= 100
          and previous_loop.end_rn < current_loop.end_rn
          and current_loop.start_rn < previous_loop.end_rn
      )
  ),
  merged as (
    select ST_Multi(ST_UnaryUnion(ST_Collect(loop_polygon)))::geometry(multipolygon, 4326) as polygon
    from accepted_polygons
  )
  select polygon,
         case when polygon is null or ST_IsEmpty(polygon) then 0 else ST_Area(polygon::geography) end
    into v_polygon, v_area_m2
  from merged;

  if v_polygon is not null and not ST_IsEmpty(v_polygon) and v_area_m2 >= 100 then
    v_simplified := ST_Multi(ST_SimplifyPreserveTopology(v_polygon, 0.00002));

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
      'live-closed-loop-v1',
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
  else
    delete from public.territories
    where daily_activity_id = p_daily_activity_id
      and user_id = v_user_id
      and state = 'live';
    v_area_m2 := 0;
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
    'state', 'live',
    'algorithmVersion', 'live-closed-loop-v1',
    'polygonGeojson', case
      when v_polygon is null or ST_IsEmpty(v_polygon) then null
      else ST_AsGeoJSON(coalesce(v_simplified, v_polygon))::jsonb
    end
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
      'finalTerritoryId', v_final.id,
      'algorithmVersion', coalesce(v_final.algorithm_version, 'final-closed-loop-v1'),
      'polygonGeojson', case
        when v_final.polygon is null or ST_IsEmpty(v_final.polygon) then null
        else ST_AsGeoJSON(coalesce(v_final.simplified_polygon, v_final.polygon))::jsonb
      end
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
      'final-closed-loop-v1',
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

  return v_sync_result || jsonb_build_object(
    'state', 'final',
    'territoryId', v_final_id,
    'finalTerritoryId', v_final_id,
    'algorithmVersion', 'final-closed-loop-v1',
    'polygonGeojson', case
      when v_live.polygon is null or ST_IsEmpty(v_live.polygon) then null
      else ST_AsGeoJSON(coalesce(v_live.simplified_polygon, v_live.polygon))::jsonb
    end
  );
end;
$$;

revoke all on function public.sync_live_territory(uuid) from public;
grant execute on function public.sync_live_territory(uuid) to authenticated;

revoke all on function public.finalize_daily_activity(uuid) from public;
grant execute on function public.finalize_daily_activity(uuid) to authenticated;
