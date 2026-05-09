import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readMigration(name: string) {
  return readFileSync(resolve(__dirname, "../../../../../../supabase/migrations", name), "utf8");
}

describe("Supabase SQL contracts", () => {
  test("finalize_daily_activity is idempotent for already finalized daily activities", () => {
    const sql = readMigration("0012_closed_loop_territory_functions.sql");

    expect(sql).toContain("if v_daily.status = 'finalized' then");
    expect(sql).toContain("'state', 'final'");
    expect(sql).toContain("'territoryId', v_final.id");
    expect(sql).toContain("'finalTerritoryId', v_final.id");
    expect(sql).toContain("coalesce(v_final.algorithm_version, 'final-closed-loop-v1')");
    expect(sql).toContain("return v_sync_result || jsonb_build_object");
    expect(sql).toContain("'territoryId', v_final_id");
    expect(sql).toContain("'finalTerritoryId', v_final_id");
  });

  test("live territory sync excludes low-quality and abnormal GPS points", () => {
    const sql = readMigration("0012_closed_loop_territory_functions.sql");

    expect(sql).toContain("coalesce(accuracy_m, 0) < 50");
    expect(sql).toContain("(speed_mps is null or speed_mps <= 15)");
    expect(sql).toContain("with recursive raw_points as");
    expect(sql).toContain("row_number() over (order by recorded_at, id)");
    expect(sql).toContain("last_accepted_position");
    expect(sql).toContain("join raw_points next_point");
    expect(sql).toContain("ST_Distance(next_point.position, scanned_points.last_accepted_position) >= 1");
    expect(sql).toContain("ST_Distance(next_point.position, scanned_points.last_accepted_position) <= greatest");
    expect(sql).toContain("'live-closed-loop-v1'");
  });

  test("closed loop territory RPCs require authenticated owners and authenticated execute grants", () => {
    const sql = readMigration("0012_closed_loop_territory_functions.sql");

    expect(sql).toContain("v_user_id uuid := auth.uid()");
    expect(sql).toContain("if v_user_id is null then");
    expect(sql).toContain("raise exception 'not authenticated'");
    expect(sql).toContain("where id = p_daily_activity_id");
    expect(sql).toContain("and user_id = v_user_id");
    expect(sql).toContain("and state = 'live'");
    expect(sql).toContain("and state = 'final'");
    expect(sql).toContain("revoke all on function public.sync_live_territory(uuid) from public");
    expect(sql).toContain("grant execute on function public.sync_live_territory(uuid) to authenticated");
    expect(sql).toContain("revoke all on function public.finalize_daily_activity(uuid) from public");
    expect(sql).toContain("grant execute on function public.finalize_daily_activity(uuid) to authenticated");
  });

  test("live territory sync counts only closed loops as territory area", () => {
    const sql = readMigration("0012_closed_loop_territory_functions.sql");

    expect(sql).toContain("b.rn - a.rn >= 3");
    expect(sql).toContain("ST_Distance(a.position, b.position) <= 500");
    expect(sql).toContain("lead(close_distance_m) over (partition by start_rn order by end_rn)");
    expect(sql).toContain("next_close_distance_m >= close_distance_m + 25");
    expect(sql).toContain("ST_MakePolygon(ST_AddPoint(line, ST_StartPoint(line)))");
    expect(sql).toContain("loop_distance_m >= 100");
    expect(sql).toContain("current_loop.loop_area_m2 >= 100");
    expect(sql).toContain("current_loop.start_rn < previous_loop.end_rn");
    expect(sql).not.toContain("current_loop.start_rn <= previous_loop.end_rn");
    expect(sql).toContain("delete from public.territories");
    expect(sql).toContain("'final-closed-loop-v1'");
    expect(sql).toContain("'polygonGeojson'");
    expect(sql).toContain("ST_AsGeoJSON(coalesce");
    expect(sql).toContain('drop policy if exists "territories_delete_own"');
    expect(sql).toContain('create policy "territories_delete_own"');
    expect(sql).toContain("on public.territories for delete");
  });

  test("RLS rejects location appends outside owned open or paused daily activities", () => {
    const coreSql = readMigration("0004_rls_core.sql");
    const closedLoopSql = readMigration("0012_closed_loop_territory_functions.sql");

    expect(coreSql).toContain("location_points_insert_own_daily_activity");
    expect(coreSql).toContain("user_id = auth.uid()");
    expect(coreSql).toContain("da.user_id = auth.uid()");
    expect(coreSql).toContain("da.status in ('open', 'paused')");
    expect(closedLoopSql).toContain('drop policy if exists "daily_activities_insert_own"');
    expect(closedLoopSql).toContain('drop policy if exists "location_points_insert_own_daily_activity"');
    expect(closedLoopSql).toContain("p.territory_capture_enabled = true");
    expect(closedLoopSql).toContain("on public.daily_activities for insert");
    expect(closedLoopSql).toContain("on public.location_points for insert");
  });

  test("friend search only exposes public-safe profile fields through authenticated RPCs", () => {
    const sql = readMigration("0006_friend_search.sql");

    expect(sql).toContain("add column if not exists friend_code");
    expect(sql).toContain("security definer");
    expect(sql).toContain("auth.uid()");
    expect(sql).toContain("p.id <> v_user_id");
    expect(sql).toContain("coalesce(f.status, 'none') <> 'blocked'");
    expect(sql).toContain("grant execute on function public.search_profiles_by_friend_code(text) to authenticated");
    expect(sql).toContain("grant execute on function public.request_friend_by_code(text) to authenticated");
  });

  test("friend request response is receiver-only and direct friendship updates are closed", () => {
    const rlsSql = readMigration("0007_friend_request_response.sql");

    expect(rlsSql).toContain('drop policy if exists "friendships_update_participant"');
    expect(rlsSql).toContain('drop policy if exists "friendships_insert_requester"');
    expect(rlsSql).toContain("list_incoming_friend_requests()");
    expect(rlsSql).toContain("list_outgoing_friend_requests()");
    expect(rlsSql).toContain("respond_friend_request(p_friendship_id uuid, p_action text)");
    expect(rlsSql).toContain("v_action not in ('accept', 'reject')");
    expect(rlsSql).toContain("receiver_user_id = v_user_id");
    expect(rlsSql).toContain("status = 'pending'");
    expect(rlsSql).toContain("set status = 'accepted'");
    expect(rlsSql).toContain("delete from public.friendships");
    expect(rlsSql).toContain("grant execute on function public.respond_friend_request(uuid, text) to authenticated");
  });

  test("friend rankings are scoped to self and accepted friends through an authenticated RPC", () => {
    const sql = readMigration("0011_ranking_delta_periods.sql");

    expect(sql).toContain("list_friend_rankings()");
    expect(sql).toContain("security definer");
    expect(sql).toContain("v_user_id uuid := auth.uid()");
    expect(sql).toContain("v_reference_date date := current_date");
    expect(sql).toContain("raise exception 'auth required'");
    expect(sql).toContain("select");
    expect(sql).toContain("v_user_id as user_id");
    expect(sql).toContain("fs.status = 'accepted'");
    expect(sql).toContain("fs.requester_user_id = v_user_id or fs.receiver_user_id = v_user_id");
    expect(sql).toContain("where da.local_date between v_reference_date - 6 and v_reference_date");
    expect(sql).toContain("where da.local_date between v_reference_date - 13 and v_reference_date - 7");
    expect(sql).toContain("(t.current_period_area_m2 - t.previous_period_area_m2)::double precision as delta_area_m2");
    expect(sql).toContain("dense_rank() over (order by t.total_area_m2 desc)::integer as ranking_rank");
    expect(sql).toContain("order by ranked.ranking_rank asc, ranked.display_name asc");
    expect(sql).toContain("revoke all on function public.list_friend_rankings() from public");
    expect(sql).toContain("grant execute on function public.list_friend_rankings() to authenticated");
  });

  test("friend territories expose only accepted friends final polygons through GeoJSON RPC", () => {
    const sql = readMigration("0009_friend_territories.sql");

    expect(sql).toContain("list_friend_territories()");
    expect(sql).toContain("security definer");
    expect(sql).toContain("v_user_id uuid := auth.uid()");
    expect(sql).toContain("raise exception 'auth required'");
    expect(sql).toContain("fs.status = 'accepted'");
    expect(sql).toContain("fs.requester_user_id = v_user_id or fs.receiver_user_id = v_user_id");
    expect(sql).toContain("t.state = 'final'");
    expect(sql).toContain("t.user_id <> v_user_id");
    expect(sql).toContain("ST_AsGeoJSON(coalesce(t.simplified_polygon, t.polygon))::jsonb");
    expect(sql).toContain("revoke all on function public.list_friend_territories() from public");
    expect(sql).toContain("grant execute on function public.list_friend_territories() to authenticated");
  });

  test("friend live presence private channels are limited to self and accepted friends", () => {
    const sql = readMigration("0010_friend_live_presence_realtime.sql");

    expect(sql).toContain("presence_topic_user_id(p_topic text)");
    expect(sql).toContain("^presence:user:");
    expect(sql).toContain("can_access_friend_presence_topic(p_topic text)");
    expect(sql).toContain("can_track_friend_presence_topic(p_topic text)");
    expect(sql).toContain("alter table realtime.messages enable row level security");
    expect(sql).toContain('create policy "friend_presence_read_accepted_or_self"');
    expect(sql).toContain('create policy "friend_presence_track_self"');
    expect(sql).toContain("realtime.messages.extension = 'presence'");
    expect(sql).toContain("public.can_access_friend_presence_topic(realtime.topic())");
    expect(sql).toContain("target_profile.location_sharing_enabled");
    expect(sql).toContain("p.location_sharing_enabled");
    expect(sql).toContain("fs.status = 'accepted'");
    expect(sql).toContain("fs.requester_user_id = auth.uid() and fs.receiver_user_id = target.user_id");
    expect(sql).toContain("fs.receiver_user_id = auth.uid() and fs.requester_user_id = target.user_id");
    expect(sql).toContain("public.can_track_friend_presence_topic(realtime.topic())");
    expect(sql).toContain("grant execute on function public.can_access_friend_presence_topic(text) to authenticated");
    expect(sql).toContain("grant execute on function public.can_track_friend_presence_topic(text) to authenticated");
  });
});
