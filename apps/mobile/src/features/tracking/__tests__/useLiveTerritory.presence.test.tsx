import renderer, { act } from "react-test-renderer";
import { useLiveTerritory } from "@/features/tracking/hooks/useLiveTerritory";
import type { LiveTerritoryState } from "@/features/tracking/services/liveTerritoryState";
import { getCurrentTerritoryLocation } from "@/features/tracking/services/locationReader";
import { colors } from "@/theme/tokens";

const mockRepository = {
  getProfile: jest.fn(),
  getActivity: jest.fn(),
  ensureDailyActivity: jest.fn(),
  appendLocationPoint: jest.fn(),
  syncLiveTerritory: jest.fn(),
  finalizeDailyActivity: jest.fn()
};

const mockPresenceClient = {
  subscribeToFriendPresence: jest.fn(),
  publishOwnPresence: jest.fn(),
  clearOwnPresence: jest.fn()
};

const mockWatcherRemove = jest.fn();

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
  startTerritoryLocationWatcher: jest.fn(async () => ({ remove: mockWatcherRemove }))
}));

type LiveTerritoryHook = ReturnType<typeof useLiveTerritory>;

function Probe({ onState, onHook }: { onState?: (state: LiveTerritoryState) => void; onHook?: (liveTerritory: LiveTerritoryHook) => void }) {
  const liveTerritory = useLiveTerritory();
  onState?.(liveTerritory.state);
  onHook?.(liveTerritory);
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
    mockWatcherRemove.mockClear();
    mockRepository.ensureDailyActivity.mockResolvedValue(dailyActivity);
    mockRepository.getActivity.mockResolvedValue({
      id: "today",
      title: "今日",
      areaKm2: 0,
      distanceKm: 0,
      duration: "完了",
      color: colors.coral,
      createdAtLabel: "今日"
    });
    mockRepository.appendLocationPoint.mockResolvedValue(undefined);
    mockRepository.syncLiveTerritory.mockResolvedValue({ dailyActivity, territory: { id: "today" }, stats: dailyActivity.stats });
    mockRepository.finalizeDailyActivity.mockResolvedValue({
      dailyActivity,
      territory: {
        id: "today",
        title: "今日",
        areaKm2: 0,
        distanceKm: 0,
        duration: "完了",
        color: colors.coral,
        createdAtLabel: "今日"
      }
    });
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

  test("テリトリー生成OFFでも現在地は地図用stateへ反映する", async () => {
    let observedState: LiveTerritoryState | undefined;
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
      territoryCaptureEnabled: false
    });

    await act(async () => {
      renderer.create(<Probe onState={(state) => (observedState = state)} />);
      await flushAsyncWork();
    });

    expect(getCurrentTerritoryLocation).toHaveBeenCalled();
    expect(observedState?.currentLocation).toEqual(currentLocation);
    expect(observedState?.status).toBe("pausedByPrivacy");
    expect(mockRepository.ensureDailyActivity).not.toHaveBeenCalled();
    expect(mockPresenceClient.publishOwnPresence).not.toHaveBeenCalled();
    expect(mockPresenceClient.clearOwnPresence).toHaveBeenCalledWith("user-current");
  });

  test("停止系状態では手動同期を呼んでもlive同期しない", async () => {
    let liveTerritory: LiveTerritoryHook | undefined;
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
      territoryCaptureEnabled: false
    });

    await act(async () => {
      renderer.create(<Probe onHook={(next) => (liveTerritory = next)} />);
      await flushAsyncWork();
    });

    mockRepository.syncLiveTerritory.mockClear();
    await act(async () => {
      await liveTerritory?.sync();
      await flushAsyncWork();
    });

    expect(liveTerritory?.state.status).toBe("pausedByPrivacy");
    expect(mockRepository.syncLiveTerritory).not.toHaveBeenCalled();
  });

  test("同日確定済みactivityではGPSを追加せずcompletedへ復帰する", async () => {
    let observedState: LiveTerritoryState | undefined;
    const finalizedDailyActivity = { ...dailyActivity, status: "finalized" as const };
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
    mockRepository.ensureDailyActivity.mockResolvedValue(finalizedDailyActivity);

    await act(async () => {
      renderer.create(<Probe onState={(state) => (observedState = state)} />);
      await flushAsyncWork();
    });

    expect(observedState?.status).toBe("completed");
    expect(observedState?.dailyActivity).toEqual(finalizedDailyActivity);
    expect(mockRepository.getActivity).toHaveBeenCalledWith(finalizedDailyActivity.id);
    expect(mockRepository.appendLocationPoint).not.toHaveBeenCalled();
    expect(mockRepository.syncLiveTerritory).not.toHaveBeenCalled();
    expect(mockPresenceClient.publishOwnPresence).not.toHaveBeenCalled();
  });

  test("finalize開始時にwatcherを止め、finalize中の手動同期を呼ばない", async () => {
    let liveTerritory: LiveTerritoryHook | undefined;
    let resolveFinalize: ((value: Awaited<ReturnType<LiveTerritoryHook["finalize"]>>) => void) | undefined;
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
    mockRepository.finalizeDailyActivity.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFinalize = resolve;
        })
    );

    await act(async () => {
      renderer.create(<Probe onHook={(next) => (liveTerritory = next)} />);
      await flushAsyncWork();
    });
    expect(liveTerritory?.state.status).toBe("live");

    mockRepository.syncLiveTerritory.mockClear();
    await act(async () => {
      void liveTerritory?.finalize();
      await flushAsyncWork();
    });
    expect(mockWatcherRemove).toHaveBeenCalledTimes(1);

    await act(async () => {
      await liveTerritory?.sync();
      await flushAsyncWork();
    });
    expect(mockRepository.syncLiveTerritory).not.toHaveBeenCalled();

    await act(async () => {
      resolveFinalize?.({
        dailyActivity,
        territory: {
          id: "today",
          title: "今日",
          areaKm2: 0,
          distanceKm: 0,
          duration: "完了",
          color: colors.coral,
          createdAtLabel: "今日"
        }
      });
      await flushAsyncWork();
    });
  });
});
