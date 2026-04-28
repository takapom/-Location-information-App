import { startTerritoryLocationWatcher, type LocationWatcherAdapter } from "@/features/tracking/services/locationWatcher";

jest.mock("expo-location", () => ({
  Accuracy: {
    Balanced: 3
  },
  watchPositionAsync: jest.fn()
}));

describe("startTerritoryLocationWatcher", () => {
  test("watchPositionAsyncの位置更新をCurrentLocationへ変換して通知する", async () => {
    const remove = jest.fn();
    const onLocation = jest.fn();
    const adapter: LocationWatcherAdapter = {
      watchPositionAsync: jest.fn(async (_options, callback) => {
        callback({
          coords: {
            latitude: 35.681236,
            longitude: 139.767125,
            accuracy: 10,
            speed: 1.2
          },
          timestamp: Date.parse("2026-04-28T03:00:00.000Z")
        });
        return { remove };
      })
    };

    const subscription = await startTerritoryLocationWatcher({ onLocation }, adapter);

    expect(adapter.watchPositionAsync).toHaveBeenCalledWith(expect.objectContaining({ distanceInterval: 1, timeInterval: 1000 }), expect.any(Function));
    expect(onLocation).toHaveBeenCalledWith({
      latitude: 35.681236,
      longitude: 139.767125,
      accuracyM: 10,
      speedMps: 1.2,
      recordedAt: "2026-04-28T03:00:00.000Z"
    });

    subscription.remove();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  test("onLocationの失敗はonErrorへ渡す", async () => {
    const error = new Error("append failed");
    const onError = jest.fn();
    const adapter: LocationWatcherAdapter = {
      watchPositionAsync: jest.fn(async (_options, callback) => {
        callback({
          coords: {
            latitude: 35.681236,
            longitude: 139.767125,
            accuracy: 10,
            speed: null
          },
          timestamp: Date.parse("2026-04-28T03:00:00.000Z")
        });
        return { remove: jest.fn() };
      })
    };

    await startTerritoryLocationWatcher({ onLocation: () => Promise.reject(error), onError }, adapter);
    await Promise.resolve();

    expect(onError).toHaveBeenCalledWith(error);
  });
});
