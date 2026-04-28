import type { FriendPresence } from "@terri/shared";
import { getActiveFriendPresenceCount, getVisibleFriendPresences, formatPresenceUpdatedAt, isFriendPresenceOnline } from "@/features/friends/presence";
import { colors } from "@/theme/tokens";

const baseFriend: FriendPresence = {
  id: "sakura",
  displayName: "Sakura",
  initials: "S",
  color: colors.coral,
  totalAreaKm2: 1.5,
  isActive: true,
  updatedAt: "2026-04-26T03:00:00.000Z",
  locationSharingEnabled: true,
  position: { latitude: 35.661, longitude: 139.699 }
};

describe("friend presence helpers", () => {
  test("共有OFFの友達は地図表示対象から外す", () => {
    const hidden = { ...baseFriend, id: "hidden", locationSharingEnabled: false };
    const noPosition = { ...baseFriend, id: "no-position", position: undefined };

    expect(getVisibleFriendPresences([baseFriend, hidden, noPosition])).toEqual([baseFriend]);
    expect(formatPresenceUpdatedAt(hidden, new Date("2026-04-26T03:01:00.000Z"))).toBe("共有OFF");
  });

  test("30分以上更新がないpresenceはオンライン扱いにしない", () => {
    const now = new Date("2026-04-26T03:31:00.000Z");

    expect(isFriendPresenceOnline(baseFriend, now)).toBe(false);
    expect(getActiveFriendPresenceCount([baseFriend], now)).toBe(0);
    expect(formatPresenceUpdatedAt(baseFriend, now)).toBe("オフライン");
  });

  test("共有中かつ新しいactive presenceだけアクティブ人数に数える", () => {
    const now = new Date("2026-04-26T03:02:00.000Z");
    const inactive = { ...baseFriend, id: "inactive", isActive: false };
    const hidden = { ...baseFriend, id: "hidden", locationSharingEnabled: false };

    expect(getActiveFriendPresenceCount([baseFriend, inactive, hidden], now)).toBe(1);
    expect(formatPresenceUpdatedAt(baseFriend, now)).toBe("2分前");
  });
});
