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
});
