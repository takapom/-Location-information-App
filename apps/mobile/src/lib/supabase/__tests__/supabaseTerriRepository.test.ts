import { colors } from "@/theme/tokens";
import { mapActivitySummary, mapDailyActivityRow } from "@/lib/supabase/supabaseTerriRepository";

const dailyRow = {
  id: "activity-1",
  user_id: "user-1",
  local_date: "2026-04-27",
  timezone: "Asia/Tokyo",
  status: "open" as const,
  started_at: "2026-04-27T00:00:00.000Z",
  ended_at: "2026-04-27T00:12:34.000Z",
  distance_m: 1234.5,
  area_m2: 98765.4,
  point_count: 42,
  created_at: "2026-04-27T00:00:00.000Z",
  updated_at: "2026-04-27T00:12:34.000Z"
};

describe("supabaseTerriRepository mappers", () => {
  test("daily_activities rowをアプリ内DailyActivity契約へ変換する", () => {
    expect(mapDailyActivityRow(dailyRow)).toMatchObject({
      id: "activity-1",
      localDate: "2026-04-27",
      timezone: "Asia/Tokyo",
      status: "open",
      stats: {
        elapsed: "12:34",
        distanceKm: 1.23,
        previewAreaKm2: 0.0988,
        lastSyncedAt: "2026-04-27T00:12:34.000Z"
      }
    });
  });

  test("履歴表示用summaryはm/km2へ丸めて陣地色を保持する", () => {
    expect(mapActivitySummary(dailyRow, colors.mint)).toMatchObject({
      id: "activity-1",
      areaKm2: 0.0988,
      distanceKm: 1.23,
      duration: "12:34",
      color: colors.mint
    });
  });
});
