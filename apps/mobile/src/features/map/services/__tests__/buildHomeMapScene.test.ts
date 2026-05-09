import type { FriendPresence, FriendTerritory, UserProfile } from "@terri/shared";
import { colors } from "@/theme/tokens";
import { buildHomeMapScene } from "../buildHomeMapScene";

const profile: UserProfile = {
  id: "me",
  name: "Me",
  initials: "ME",
  emojiStatus: "🚶",
  territoryColor: colors.coral,
  totalAreaKm2: 1,
  totalDistanceKm: 3,
  notificationsEnabled: true,
  backgroundTrackingEnabled: false,
  locationSharingEnabled: true,
  territoryCaptureEnabled: true
};

const visibleFriend: FriendPresence = {
  id: "sakura",
  displayName: "Sakura",
  initials: "S",
  color: colors.mint,
  totalAreaKm2: 0.4,
  isActive: true,
  updatedAt: new Date().toISOString(),
  locationSharingEnabled: true,
  position: { latitude: 35.661, longitude: 139.701 }
};

const hiddenFriend: FriendPresence = {
  ...visibleFriend,
  id: "hidden",
  locationSharingEnabled: false,
  position: { latitude: 35.662, longitude: 139.702 }
};

const friendTerritory: FriendTerritory = {
  id: "territory-sakura-final",
  friendUserId: "sakura",
  displayName: "Sakura",
  color: colors.mint,
  areaKm2: 0.42,
  calculatedAt: "2026-05-04T00:00:00.000Z",
  polygon: {
    type: "Polygon",
    coordinates: [
      [
        [139.699, 35.661],
        [139.701, 35.661],
        [139.701, 35.659],
        [139.699, 35.659],
        [139.699, 35.661]
      ]
    ]
  }
};

describe("buildHomeMapScene", () => {
  test("currentLocationがある場合はplaceLabelが現在地になる", () => {
    const scene = buildHomeMapScene({
      profile,
      friends: [],
      friendTerritories: [],
      currentLocation: { latitude: 35.66, longitude: 139.7 },
      activeFriendCount: 0,
      isLive: false,
      showRoute: false,
      attribution: "© OpenStreetMap contributors"
    });

    expect(scene.chrome.placeLabel).toBe("現在地");
    expect(scene.viewport.center).toEqual({ latitude: 35.66, longitude: 139.7 });
    expect(scene.user.marker).toEqual({ initials: "ME", color: colors.coral });
  });

  test("currentLocationがない場合はfallback labelになる", () => {
    const scene = buildHomeMapScene({
      friends: [],
      friendTerritories: [],
      activeFriendCount: 0,
      isLive: false,
      showRoute: false,
      attribution: "© OpenStreetMap contributors",
      fallbackPlaceLabel: "Tokyo"
    });

    expect(scene.chrome.placeLabel).toBe("Tokyo");
  });

  test("visible friend presenceだけfriends layerへ入る", () => {
    const scene = buildHomeMapScene({
      profile,
      friends: [visibleFriend, hiddenFriend, { ...visibleFriend, id: "missing-position", position: undefined }],
      friendTerritories: [],
      activeFriendCount: 1,
      isLive: false,
      showRoute: false,
      attribution: "© OpenStreetMap contributors"
    });

    expect(scene.layers.friends.map((friend) => friend.id)).toEqual(["sakura"]);
  });

  test("active friend countとattributionがchromeへ入る", () => {
    const scene = buildHomeMapScene({
      profile,
      friends: [],
      friendTerritories: [],
      activeFriendCount: 3,
      isLive: false,
      showRoute: false,
      attribution: "© OpenStreetMap contributors"
    });

    expect(scene.chrome.activeFriendCount).toBe(3);
    expect(scene.chrome.attribution).toBe("© OpenStreetMap contributors");
  });

  test("friend final territoriesがfriendFinalTerritoriesへ入る", () => {
    const scene = buildHomeMapScene({
      profile,
      friends: [],
      friendTerritories: [friendTerritory],
      activeFriendCount: 0,
      isLive: false,
      showRoute: false,
      attribution: "© OpenStreetMap contributors"
    });

    expect(scene.layers.friendFinalTerritories[0]).toMatchObject({
      id: "territory-sakura-final",
      userId: "sakura",
      geometry: friendTerritory.polygon
    });
  });

  test("live stateではlivePreviewが入る", () => {
    const livePreviewGeometry = friendTerritory.polygon;
    const trackingRoute = [
      { latitude: 35.66, longitude: 139.7 },
      { latitude: 35.661, longitude: 139.701 }
    ];
    const scene = buildHomeMapScene({
      profile,
      friends: [],
      friendTerritories: [],
      currentLocation: { latitude: 35.66, longitude: 139.7 },
      activeFriendCount: 0,
      isLive: true,
      showRoute: true,
      attribution: "© OpenStreetMap contributors",
      livePreviewGeometry,
      trackingRoute
    });

    expect(scene.layers.livePreview?.geometry).toBe(livePreviewGeometry);
    expect(scene.layers.trackingRoute?.coordinates).toEqual(trackingRoute);
  });

  test("閉じたループがないlive stateでは面プレビューを出さず軌跡だけ渡す", () => {
    const trackingRoute = [
      { latitude: 35.66, longitude: 139.7 },
      { latitude: 35.661, longitude: 139.701 }
    ];
    const scene = buildHomeMapScene({
      profile,
      friends: [],
      friendTerritories: [],
      currentLocation: { latitude: 35.66, longitude: 139.7 },
      activeFriendCount: 0,
      isLive: true,
      showRoute: true,
      attribution: "© OpenStreetMap contributors",
      trackingRoute
    });

    expect(scene.layers.livePreview).toBeUndefined();
    expect(scene.layers.trackingRoute?.coordinates).toEqual(trackingRoute);
  });
});
