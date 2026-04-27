import { requestTerritoryLocationPermission, type LocationPermissionAdapter } from "@/features/tracking/services/locationPermission";

const PermissionStatus = {
  GRANTED: "granted",
  DENIED: "denied",
  UNDETERMINED: "undetermined"
} as const;

jest.mock("expo-location", () => ({
  PermissionStatus,
  hasServicesEnabledAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn()
}));

function createAdapter(overrides: Partial<LocationPermissionAdapter> = {}): LocationPermissionAdapter {
  return {
    hasServicesEnabledAsync: jest.fn().mockResolvedValue(true),
    getForegroundPermissionsAsync: jest.fn().mockResolvedValue({
      granted: false,
      status: PermissionStatus.UNDETERMINED,
      canAskAgain: true
    }),
    requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({
      granted: true,
      status: PermissionStatus.GRANTED,
      canAskAgain: true
    }),
    ...overrides
  };
}

describe("requestTerritoryLocationPermission", () => {
  test("位置情報サービスがOFFならservicesDisabledを返す", async () => {
    const adapter = createAdapter({
      hasServicesEnabledAsync: jest.fn().mockResolvedValue(false)
    });

    await expect(requestTerritoryLocationPermission(adapter)).resolves.toBe("servicesDisabled");
    expect(adapter.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  test("既に許可済みなら再リクエストしない", async () => {
    const adapter = createAdapter({
      getForegroundPermissionsAsync: jest.fn().mockResolvedValue({
        granted: true,
        status: PermissionStatus.GRANTED,
        canAskAgain: true
      })
    });

    await expect(requestTerritoryLocationPermission(adapter)).resolves.toBe("granted");
    expect(adapter.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  test("未決定なら許可リクエスト結果を返す", async () => {
    const adapter = createAdapter();

    await expect(requestTerritoryLocationPermission(adapter)).resolves.toBe("granted");
    expect(adapter.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  test("再確認不可の拒否はdeniedを返す", async () => {
    const adapter = createAdapter({
      getForegroundPermissionsAsync: jest.fn().mockResolvedValue({
        granted: false,
        status: PermissionStatus.DENIED,
        canAskAgain: false
      })
    });

    await expect(requestTerritoryLocationPermission(adapter)).resolves.toBe("denied");
    expect(adapter.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });
});
