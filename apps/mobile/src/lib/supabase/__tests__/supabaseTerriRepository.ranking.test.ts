import { colors } from "@/theme/tokens";
import { createSupabaseTerriRepository } from "@/lib/supabase/supabaseTerriRepository";
import { RepositoryError } from "@/lib/repositories/terriRepository";

let mockSupabaseClient: unknown;

jest.mock("@/lib/supabase/supabaseClient", () => ({
  getSupabaseClient: () => mockSupabaseClient
}));

describe("supabaseTerriRepository ranking", () => {
  beforeEach(() => {
    mockSupabaseClient = undefined;
  });

  test("ランキングRPCの前にプロフィールを確保する", async () => {
    const getUser = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const maybeSingleProfile = jest.fn().mockResolvedValue({
      data: {
        id: "user-1",
        display_name: "Current User",
        avatar_url: null,
        territory_color: colors.coral,
        emoji_status: null,
        location_sharing_enabled: true,
        territory_capture_enabled: true,
        background_tracking_enabled: false,
        notifications_enabled: true
      },
      error: null
    });
    const selectProfiles = jest.fn(() => ({ eq: jest.fn(() => ({ maybeSingle: maybeSingleProfile })) }));
    const selectDailyActivities = jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) }));
    const rpc = jest.fn().mockResolvedValue({
      data: [
        {
          user_id: "user-1",
          display_name: "Current User",
          avatar_url: null,
          territory_color: colors.coral,
          total_area_m2: 0,
          delta_area_m2: 0,
          rank: 1,
          is_current_user: true
        }
      ],
      error: null
    });
    const from = jest.fn((table: string) => {
      if (table === "profiles") return { select: selectProfiles };
      if (table === "daily_activities") return { select: selectDailyActivities };
      throw new Error(`unexpected table: ${table}`);
    });

    mockSupabaseClient = {
      auth: { getUser },
      from,
      rpc
    };

    const repository = createSupabaseTerriRepository();

    await expect(repository.getRankings()).resolves.toEqual([
      expect.objectContaining({ id: "user-1", rank: 1, isCurrentUser: true })
    ]);
    expect(rpc).toHaveBeenCalledWith("list_friend_rankings");
    expect(maybeSingleProfile.mock.invocationCallOrder[0]).toBeLessThan(rpc.mock.invocationCallOrder[0]);
  });

  test("確定済みactivityのlive同期エラーはinvalid-stateへ正規化する", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "daily activity not found or not syncable", code: "P0002" }
    });

    mockSupabaseClient = {
      rpc
    };

    const repository = createSupabaseTerriRepository();

    await expect(repository.syncLiveTerritory("daily-1")).rejects.toEqual(
      new RepositoryError("daily activity not found or not syncable", "invalid-state")
    );
  });

  test("テリトリー生成OFFでは日次Activity作成とGPS点保存を拒否する", async () => {
    const getUser = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const maybeSingleProfile = jest.fn().mockResolvedValue({
      data: {
        id: "user-1",
        display_name: "Current User",
        avatar_url: null,
        territory_color: colors.coral,
        emoji_status: null,
        location_sharing_enabled: true,
        territory_capture_enabled: false,
        background_tracking_enabled: false,
        notifications_enabled: true
      },
      error: null
    });
    const insertLocation = jest.fn().mockResolvedValue({ error: null });
    const selectProfiles = jest.fn(() => ({ eq: jest.fn(() => ({ maybeSingle: maybeSingleProfile })) }));
    const selectDailyActivities = jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) }));
    const from = jest.fn((table: string) => {
      if (table === "profiles") return { select: selectProfiles };
      if (table === "daily_activities") return { select: selectDailyActivities };
      if (table === "location_points") return { insert: insertLocation };
      throw new Error(`unexpected table: ${table}`);
    });

    mockSupabaseClient = {
      auth: { getUser },
      from
    };

    const repository = createSupabaseTerriRepository();

    await expect(repository.ensureDailyActivity({ localDate: "2026-04-26", timezone: "Asia/Tokyo" })).rejects.toEqual(
      new RepositoryError("テリトリー生成がOFFです", "permission-denied")
    );
    await expect(
      repository.appendLocationPoint({
        dailyActivityId: "daily-1",
        latitude: 35.66,
        longitude: 139.7,
        accuracyM: 12,
        recordedAt: "2026-04-26T03:00:00.000Z"
      })
    ).rejects.toEqual(new RepositoryError("テリトリー生成がOFFです", "permission-denied"));
    expect(insertLocation).not.toHaveBeenCalled();
  });
});
