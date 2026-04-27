import { getCurrentTerritoryLocation, type LocationReaderAdapter } from "@/features/tracking/services/locationReader";

jest.mock("expo-location", () => ({
  Accuracy: {
    Balanced: 3
  },
  getCurrentPositionAsync: jest.fn()
}));

describe("getCurrentTerritoryLocation", () => {
  test("expo-locationの現在地をGPS点保存向けの契約へ変換する", async () => {
    const adapter: LocationReaderAdapter = {
      getCurrentPositionAsync: jest.fn().mockResolvedValue({
        coords: {
          latitude: 35.681236,
          longitude: 139.767125,
          accuracy: 11,
          speed: 1.4
        },
        timestamp: Date.parse("2026-04-27T03:00:00.000Z")
      })
    };

    await expect(getCurrentTerritoryLocation(adapter)).resolves.toEqual({
      latitude: 35.681236,
      longitude: 139.767125,
      accuracyM: 11,
      speedMps: 1.4,
      recordedAt: "2026-04-27T03:00:00.000Z"
    });
  });

  test("accuracyが取れない場合は低品質点として扱える値にする", async () => {
    const adapter: LocationReaderAdapter = {
      getCurrentPositionAsync: jest.fn().mockResolvedValue({
        coords: {
          latitude: 35.681236,
          longitude: 139.767125,
          accuracy: null,
          speed: null
        },
        timestamp: Date.parse("2026-04-27T03:00:00.000Z")
      })
    };

    await expect(getCurrentTerritoryLocation(adapter)).resolves.toMatchObject({
      accuracyM: 999,
      speedMps: undefined
    });
  });
});
