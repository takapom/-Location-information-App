import { getDistanceMeters, isAcceptedLocationPoint, shouldSendTrackedLocation } from "@/features/tracking/services/trackingPolicy";

const baseLocation = {
  latitude: 35.681236,
  longitude: 139.767125,
  accuracyM: 12,
  recordedAt: "2026-04-28T03:00:00.000Z"
};

describe("trackingPolicy", () => {
  test("accuracyが50m以上のGPS点は保存対象にしない", () => {
    expect(isAcceptedLocationPoint({ accuracyM: 49.9 })).toBe(true);
    expect(isAcceptedLocationPoint({ accuracyM: 50 })).toBe(false);
    expect(shouldSendTrackedLocation({ currentLocation: { ...baseLocation, accuracyM: 80 } })).toBe(false);
  });

  test("初回の高精度GPS点は送信対象にする", () => {
    expect(shouldSendTrackedLocation({ currentLocation: baseLocation })).toBe(true);
  });

  test("5秒経過または10m移動で送信対象にする", () => {
    expect(
      shouldSendTrackedLocation({
        lastSentLocation: baseLocation,
        currentLocation: { ...baseLocation, recordedAt: "2026-04-28T03:00:05.000Z" }
      })
    ).toBe(true);
    expect(
      shouldSendTrackedLocation({
        lastSentLocation: baseLocation,
        currentLocation: { ...baseLocation, latitude: 35.681336, recordedAt: "2026-04-28T03:00:02.000Z" }
      })
    ).toBe(true);
    expect(
      shouldSendTrackedLocation({
        lastSentLocation: baseLocation,
        currentLocation: { ...baseLocation, latitude: 35.68125, recordedAt: "2026-04-28T03:00:02.000Z" }
      })
    ).toBe(false);
  });

  test("距離計算はGPS送信判定で使えるメートル単位を返す", () => {
    expect(getDistanceMeters(baseLocation, { latitude: 35.681326, longitude: 139.767125 })).toBeGreaterThan(9);
  });
});
