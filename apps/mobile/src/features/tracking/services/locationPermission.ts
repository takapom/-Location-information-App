import * as Location from "expo-location";
import { PermissionStatus } from "expo-location";

export type TerritoryLocationPermissionState = "granted" | "denied" | "servicesDisabled" | "unavailable";

type LocationPermissionResponse = {
  granted: boolean;
  status: PermissionStatus;
  canAskAgain: boolean;
};

export type LocationPermissionAdapter = {
  hasServicesEnabledAsync: () => Promise<boolean>;
  getForegroundPermissionsAsync: () => Promise<LocationPermissionResponse>;
  requestForegroundPermissionsAsync: () => Promise<LocationPermissionResponse>;
};

const expoLocationAdapter: LocationPermissionAdapter = {
  hasServicesEnabledAsync: Location.hasServicesEnabledAsync,
  getForegroundPermissionsAsync: Location.getForegroundPermissionsAsync,
  requestForegroundPermissionsAsync: Location.requestForegroundPermissionsAsync
};

function isGranted(response: LocationPermissionResponse) {
  return response.granted || response.status === PermissionStatus.GRANTED;
}

export async function requestTerritoryLocationPermission(adapter: LocationPermissionAdapter = expoLocationAdapter): Promise<TerritoryLocationPermissionState> {
  try {
    const servicesEnabled = await adapter.hasServicesEnabledAsync();
    if (!servicesEnabled) return "servicesDisabled";

    const current = await adapter.getForegroundPermissionsAsync();
    if (isGranted(current)) return "granted";
    if (!current.canAskAgain) return "denied";

    const requested = await adapter.requestForegroundPermissionsAsync();
    return isGranted(requested) ? "granted" : "denied";
  } catch {
    return "unavailable";
  }
}
