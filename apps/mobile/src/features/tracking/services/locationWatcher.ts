import * as Location from "expo-location";
import { mapLocationObjectToCurrentLocation, type CurrentLocation, type LocationObjectLike } from "./locationReader";

export type LocationWatcherSubscription = {
  remove: () => void;
};

export type LocationWatcherAdapter = {
  watchPositionAsync: (
    options: {
      accuracy: Location.LocationAccuracy;
      distanceInterval: number;
      timeInterval: number;
    },
    callback: (location: LocationObjectLike) => void
  ) => Promise<LocationWatcherSubscription>;
};

export type StartTerritoryLocationWatcherInput = {
  onLocation: (location: CurrentLocation) => void | Promise<void>;
  onError?: (error: unknown) => void;
};

const expoLocationWatcherAdapter: LocationWatcherAdapter = {
  watchPositionAsync: Location.watchPositionAsync
};

export function startTerritoryLocationWatcher(input: StartTerritoryLocationWatcherInput, adapter: LocationWatcherAdapter = expoLocationWatcherAdapter) {
  return adapter.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 1,
      timeInterval: 1000
    },
    (position) => {
      Promise.resolve(input.onLocation(mapLocationObjectToCurrentLocation(position))).catch((error) => {
        input.onError?.(error);
      });
    }
  );
}
