import type { FriendLivePresencePayload, FriendPresence, UserProfile } from "@terri/shared";
import {
  buildFriendPresenceChannelName,
  createFriendLivePresencePayload,
  latestFriendLivePresenceFromState,
  mergeFriendsWithLivePresence,
  parseFriendLivePresencePayload,
  shouldPublishFriendLivePresence
} from "@/features/friends/services/livePresence";
import { colors } from "@/theme/tokens";

const profile: UserProfile = {
  id: "user-current",
  name: "ユーザー",
  initials: "U",
  emojiStatus: "移動中",
  territoryColor: colors.coral,
  totalAreaKm2: 1,
  totalDistanceKm: 2,
  notificationsEnabled: true,
  backgroundTrackingEnabled: true,
  locationSharingEnabled: true,
  territoryCaptureEnabled: true
};

const friend: FriendPresence = {
  id: "friend-1",
  displayName: "Sakura",
  initials: "S",
  color: colors.mint,
  totalAreaKm2: 1.5,
  isActive: false,
  updatedAt: "2026-04-29T00:00:00.000Z",
  locationSharingEnabled: true
};

const payload: FriendLivePresencePayload = {
  userId: "friend-1",
  position: { latitude: 35.66, longitude: 139.7 },
  updatedAt: "2026-04-29T01:00:00.000Z",
  isActive: true,
  locationSharingEnabled: true,
  accuracyM: 12
};

describe("live presence service", () => {
  test("共有ONの現在地からPresence payloadを作る", () => {
    expect(buildFriendPresenceChannelName("user-current")).toBe("presence:user:user-current");
    expect(
      createFriendLivePresencePayload({
        profile,
        currentLocation: { latitude: 35.66, longitude: 139.7, accuracyM: 12, recordedAt: "2026-04-29T01:00:00.000Z" },
        isActive: true
      })
    ).toEqual({
      userId: "user-current",
      position: { latitude: 35.66, longitude: 139.7 },
      updatedAt: "2026-04-29T01:00:00.000Z",
      isActive: true,
      locationSharingEnabled: true,
      accuracyM: 12
    });
  });

  test("共有OFFではPresence payloadを作らず15秒未満の再送を抑制する", () => {
    expect(
      createFriendLivePresencePayload({
        profile: { ...profile, locationSharingEnabled: false },
        currentLocation: { latitude: 35.66, longitude: 139.7, recordedAt: "2026-04-29T01:00:00.000Z" },
        isActive: true
      })
    ).toBeUndefined();
    expect(shouldPublishFriendLivePresence({ lastPublishedAtMs: 1000, nowMs: 15_999 })).toBe(false);
    expect(shouldPublishFriendLivePresence({ lastPublishedAtMs: 1000, nowMs: 16_000 })).toBe(true);
  });

  test("承認済み友達一覧の表示情報を正にしてPresence位置だけmergeする", () => {
    expect(mergeFriendsWithLivePresence([friend], { "friend-1": payload })).toEqual([
      {
        ...friend,
        isActive: true,
        position: { latitude: 35.66, longitude: 139.7 },
        updatedAt: "2026-04-29T01:00:00.000Z"
      }
    ]);
  });

  test("不正または別ユーザーのPresence payloadは無視する", () => {
    expect(parseFriendLivePresencePayload({ ...payload, userId: "other" }, "friend-1")).toBeUndefined();
    expect(parseFriendLivePresencePayload({ ...payload, position: { latitude: 999, longitude: 139.7 } }, "friend-1")).toBeUndefined();
    expect(parseFriendLivePresencePayload(payload, "friend-1")).toEqual(payload);
  });

  test("presenceStateから最新の対象ユーザーpayloadを選ぶ", () => {
    expect(
      latestFriendLivePresenceFromState(
        {
          "friend-1": [
            { ...payload, updatedAt: "2026-04-29T00:59:00.000Z" },
            payload
          ],
          other: [{ ...payload, userId: "other", updatedAt: "2026-04-29T02:00:00.000Z" }]
        },
        "friend-1"
      )
    ).toEqual(payload);
  });
});
