import renderer, { act } from "react-test-renderer";
import { useLiveTerritory } from "@/features/tracking/hooks/useLiveTerritory";
import { colors } from "@/theme/tokens";

const mockRepository = {
  getProfile: jest.fn(),
  ensureDailyActivity: jest.fn(),
  appendLocationPoint: jest.fn(),
  syncLiveTerritory: jest.fn()
};

const mockPresenceClient = {
  subscribeToFriendPresence: jest.fn(),
  publishOwnPresence: jest.fn(),
  clearOwnPresence: jest.fn()
};

const currentLocation = {
  latitude: 35.66,
  longitude: 139.7,
  accuracyM: 12,
  recordedAt: "2026-04-29T01:00:00.000Z"
};

const dailyActivity = {
  id: "daily-2026-04-29",
  localDate: "2026-04-29",
  timezone: "Asia/Tokyo",
  status: "open" as const,
  stats: { elapsed: "進行中", distanceKm: 0, previewAreaKm2: 0 }
};

jest.mock("react-native", () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() }))
  }
}));

jest.mock("@/lib/repositories/RepositoryProvider", () => ({
  useTerriRepository: () => mockRepository
}));

jest.mock("@/lib/realtime/PresenceProvider", () => ({
  useTerriPresenceClient: () => mockPresenceClient
}));

jest.mock("@/features/tracking/services/locationPermission", () => ({
  requestTerritoryLocationPermission: jest.fn(async () => "granted")
}));

jest.mock("@/features/tracking/services/locationReader", () => ({
  getCurrentTerritoryLocation: jest.fn(async () => currentLocation)
}));

jest.mock("@/features/tracking/services/locationWatcher", () => ({
  startTerritoryLocationWatcher: jest.fn(async () => ({ remove: jest.fn() }))
}));

function Probe() {
  useLiveTerritory();
  return null;
}

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("useLiveTerritory presence integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository.ensureDailyActivity.mockResolvedValue(dailyActivity);
    mockRepository.appendLocationPoint.mockResolvedValue(undefined);
    mockRepository.syncLiveTerritory.mockResolvedValue({ dailyActivity, territory: { id: "today" }, stats: dailyActivity.stats });
    mockPresenceClient.publishOwnPresence.mockResolvedValue(undefined);
    mockPresenceClient.clearOwnPresence.mockResolvedValue(undefined);
  });

  test("位置共有ONなら初回現在地をPresenceへ送る", async () => {
    mockRepository.getProfile.mockResolvedValue({
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
    });

    await act(async () => {
      renderer.create(<Probe />);
      await flushAsyncWork();
    });

    expect(mockPresenceClient.publishOwnPresence).toHaveBeenCalledWith({
      userId: "user-current",
      position: { latitude: 35.66, longitude: 139.7 },
      updatedAt: "2026-04-29T01:00:00.000Z",
      isActive: true,
      locationSharingEnabled: true,
      accuracyM: 12
    });
  });

  test("位置共有OFFならPresenceを送らず既存Presenceを解除する", async () => {
    mockRepository.getProfile.mockResolvedValue({
      id: "user-current",
      name: "ユーザー",
      initials: "U",
      emojiStatus: "移動中",
      territoryColor: colors.coral,
      totalAreaKm2: 1,
      totalDistanceKm: 2,
      notificationsEnabled: true,
      backgroundTrackingEnabled: true,
      locationSharingEnabled: false,
      territoryCaptureEnabled: true
    });

    await act(async () => {
      renderer.create(<Probe />);
      await flushAsyncWork();
    });

    expect(mockPresenceClient.publishOwnPresence).not.toHaveBeenCalled();
    expect(mockPresenceClient.clearOwnPresence).toHaveBeenCalledWith("user-current");
  });

  test("Presence送信直前に共有設定を再確認する", async () => {
    mockRepository.getProfile
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
        id: "user-current",
        name: "ユーザー",
        initials: "U",
        emojiStatus: "移動中",
        territoryColor: colors.coral,
        totalAreaKm2: 1,
        totalDistanceKm: 2,
        notificationsEnabled: true,
        backgroundTrackingEnabled: true,
        locationSharingEnabled: false,
        territoryCaptureEnabled: true
      });

    await act(async () => {
      renderer.create(<Probe />);
      await flushAsyncWork();
    });

    expect(mockPresenceClient.publishOwnPresence).not.toHaveBeenCalled();
    expect(mockPresenceClient.clearOwnPresence).toHaveBeenCalledWith("user-current");
  });
});
