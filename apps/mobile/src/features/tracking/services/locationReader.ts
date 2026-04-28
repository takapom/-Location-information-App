import * as Location from "expo-location";
import type { GeoPoint } from "@terri/shared";

export type CurrentLocation = GeoPoint & {
  accuracyM: number;
  speedMps?: number;
  recordedAt: string;
};

export type LocationObjectLike = {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    speed?: number | null;
  };
  timestamp: number;
};

export type LocationReaderAdapter = {
  getCurrentPositionAsync: (options: { accuracy: Location.LocationAccuracy }) => Promise<LocationObjectLike>;
};

const expoLocationReaderAdapter: LocationReaderAdapter = {
  getCurrentPositionAsync: Location.getCurrentPositionAsync
};

export async function getCurrentTerritoryLocation(adapter: LocationReaderAdapter = expoLocationReaderAdapter): Promise<CurrentLocation> {
  const position = await adapter.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

  return mapLocationObjectToCurrentLocation(position);
}

export function mapLocationObjectToCurrentLocation(position: LocationObjectLike): CurrentLocation {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyM: position.coords.accuracy ?? 999,
    speedMps: position.coords.speed ?? undefined,
    recordedAt: new Date(position.timestamp).toISOString()
  };
}
