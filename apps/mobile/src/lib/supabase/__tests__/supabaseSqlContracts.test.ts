import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readMigration(name: string) {
  return readFileSync(resolve(__dirname, "../../../../../../supabase/migrations", name), "utf8");
}

describe("Supabase SQL contracts", () => {
  test("finalize_daily_activity is idempotent for already finalized daily activities", () => {
    const sql = readMigration("0005_live_territory_functions.sql");

    expect(sql).toContain("if v_daily.status = 'finalized' then");
    expect(sql).toContain("'state', 'final'");
    expect(sql).toContain("'finalTerritoryId', v_final.id");
  });

  test("live territory sync excludes low-quality and abnormal GPS points", () => {
    const sql = readMigration("0005_live_territory_functions.sql");

    expect(sql).toContain("coalesce(accuracy_m, 0) < 50");
    expect(sql).toContain("(speed_mps is null or speed_mps <= 15)");
    expect(sql).toContain("ST_Distance(position, previous_position) >= 1");
    expect(sql).toContain("ST_Distance(position, previous_position) <= greatest");
    expect(sql).toContain("'live-buffer-v1-basic'");
  });

  test("RLS rejects location appends outside owned open or paused daily activities", () => {
    const sql = readMigration("0004_rls_core.sql");

    expect(sql).toContain("location_points_insert_own_daily_activity");
    expect(sql).toContain("user_id = auth.uid()");
    expect(sql).toContain("da.user_id = auth.uid()");
    expect(sql).toContain("da.status in ('open', 'paused')");
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
    const sql = readMigration("0008_friend_rankings.sql");

    expect(sql).toContain("list_friend_rankings()");
    expect(sql).toContain("security definer");
    expect(sql).toContain("v_user_id uuid := auth.uid()");
    expect(sql).toContain("raise exception 'auth required'");
    expect(sql).toContain("select");
    expect(sql).toContain("v_user_id as user_id");
    expect(sql).toContain("fs.status = 'accepted'");
    expect(sql).toContain("fs.requester_user_id = v_user_id or fs.receiver_user_id = v_user_id");
    expect(sql).toContain("dense_rank() over (order by t.total_area_m2 desc)::integer as ranking_rank");
    expect(sql).toContain("order by ranked.ranking_rank asc, ranked.display_name asc");
    expect(sql).toContain("0::double precision as delta_area_m2");
    expect(sql).toContain("revoke all on function public.list_friend_rankings() from public");
    expect(sql).toContain("grant execute on function public.list_friend_rankings() to authenticated");
  });
});
