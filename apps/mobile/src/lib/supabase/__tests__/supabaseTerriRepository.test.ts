import { colors } from "@/theme/tokens";
import {
  mapAcceptedFriendRow,
  mapActivitySummary,
  mapDailyActivityRow,
  mapFriendTerritoryRow,
  mapFriendSearchRow,
  mapIncomingFriendRequestRow,
  mapRankingRow
} from "@/lib/supabase/supabaseTerriRepository";

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

  test("友達検索RPCの行を公開プロフィール契約へ変換する", () => {
    expect(
      mapFriendSearchRow({
        id: "friend-1",
        friend_code: "RIKU2026",
        display_name: "Riku",
        avatar_url: null,
        territory_color: colors.sky,
        total_area_m2: 1234567,
        request_status: "pending"
      })
    ).toMatchObject({
      id: "friend-1",
      friendCode: "RIKU2026",
      displayName: "Riku",
      initials: "RI",
      color: colors.sky,
      totalAreaKm2: 1.2346,
      requestStatus: "pending"
    });
  });

  test("友達申請RPCの行を受信申請契約へ変換する", () => {
    expect(
      mapIncomingFriendRequestRow({
        friendship_id: "friendship-1",
        requester_user_id: "friend-1",
        friend_code: "YUI777",
        display_name: "Yui",
        avatar_url: null,
        territory_color: colors.lavender,
        total_area_m2: 900000,
        requested_at: "2026-04-28T00:00:00.000Z"
      })
    ).toMatchObject({
      friendshipId: "friendship-1",
      requesterUserId: "friend-1",
      requester: {
        friendCode: "YUI777",
        displayName: "Yui",
        totalAreaKm2: 0.9
      },
      status: "pending"
    });
  });

  test("承認済み友達RPCの行は位置なしの友達プロフィールとして扱う", () => {
    const friend = mapAcceptedFriendRow({
      friend_user_id: "friend-1",
      friend_code: "YUI777",
      display_name: "Yui",
      avatar_url: null,
      territory_color: colors.lavender,
      location_sharing_enabled: true,
      total_area_m2: 900000,
      accepted_at: "2026-04-28T00:00:00.000Z"
    });

    expect(friend).toMatchObject({
      id: "friend-1",
      displayName: "Yui",
      totalAreaKm2: 0.9
    });
    expect(friend.position).toBeUndefined();
  });

  test("友達ランキングRPCの行をRankingEntry契約へ変換する", () => {
    expect(
      mapRankingRow({
        user_id: "friend-1",
        display_name: "Aoi",
        avatar_url: null,
        territory_color: colors.mint,
        total_area_m2: 1234567,
        delta_area_m2: 0,
        rank: 2,
        is_current_user: false
      })
    ).toMatchObject({
      id: "friend-1",
      rank: 2,
      name: "Aoi",
      initials: "AO",
      areaKm2: 1.2346,
      deltaKm2: 0,
      color: colors.mint,
      isCurrentUser: false
    });
  });

  test("友達陣地RPCの行をFriendTerritory契約へ変換する", () => {
    const polygon = {
      type: "Polygon" as const,
      coordinates: [
        [
          [139.7, 35.66],
          [139.701, 35.66],
          [139.701, 35.661],
          [139.7, 35.66]
        ]
      ]
    };

    expect(
      mapFriendTerritoryRow({
        territory_id: "territory-1",
        friend_user_id: "friend-1",
        display_name: "Aoi",
        territory_color: "#not-supported",
        area_m2: 123456,
        calculated_at: "2026-04-29T00:00:00.000Z",
        polygon_geojson: polygon
      })
    ).toEqual({
      id: "territory-1",
      friendUserId: "friend-1",
      displayName: "Aoi",
      color: colors.coral,
      areaKm2: 0.1235,
      calculatedAt: "2026-04-29T00:00:00.000Z",
      polygon
    });
  });
});
