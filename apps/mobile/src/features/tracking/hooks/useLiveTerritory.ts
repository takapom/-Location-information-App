import { useCallback, useEffect, useReducer, useRef } from "react";
import { AppState } from "react-native";
import { useTerriRepository } from "@/lib/repositories/RepositoryProvider";
import { getLocalDateForTimezone, initialLiveTerritoryState, liveTerritoryReducer } from "@/features/tracking/services/liveTerritoryState";
import { requestTerritoryLocationPermission } from "@/features/tracking/services/locationPermission";
import { getCurrentTerritoryLocation } from "@/features/tracking/services/locationReader";

function getDeviceTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function useLiveTerritory() {
  const repository = useTerriRepository();
  const [state, dispatch] = useReducer(liveTerritoryReducer, initialLiveTerritoryState);
  const activationInFlightRef = useRef(false);

  const activate = useCallback(async () => {
    if (activationInFlightRef.current) return;
    activationInFlightRef.current = true;
    dispatch({ type: "CHECK_PERMISSION" });
    try {
      const permission = await requestTerritoryLocationPermission();
      if (permission === "denied") {
        dispatch({ type: "PERMISSION_DENIED", message: "位置情報がOFFです" });
        return;
      }
      if (permission === "servicesDisabled") {
        dispatch({ type: "BACKGROUND_LIMITED", message: "端末の位置情報サービスがOFFです" });
        return;
      }
      if (permission === "unavailable") {
        dispatch({ type: "BACKGROUND_LIMITED", message: "この環境では位置情報を取得できません" });
        return;
      }

      const profile = await repository.getProfile();
      if (!profile.territoryCaptureEnabled) {
        dispatch({ type: "PAUSE_BY_PRIVACY", message: "テリトリー生成がOFFです" });
        return;
      }

      const currentLocation = await getCurrentTerritoryLocation().catch(() => undefined);
      if (!currentLocation) {
        dispatch({ type: "BACKGROUND_LIMITED", message: "現在地を取得できません" });
        return;
      }
      dispatch({ type: "CURRENT_LOCATION_UPDATED", currentLocation });

      const timezone = getDeviceTimezone();
      const dailyActivity = await repository.ensureDailyActivity({
        localDate: getLocalDateForTimezone(new Date(), timezone),
        timezone
      });
      await repository.appendLocationPoint({
        dailyActivityId: dailyActivity.id,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracyM: currentLocation.accuracyM,
        speedMps: currentLocation.speedMps,
        recordedAt: currentLocation.recordedAt
      });
      dispatch({ type: "PERMISSION_GRANTED", dailyActivity, currentLocation });

      const synced = await repository.syncLiveTerritory(dailyActivity.id);
      dispatch({ type: "SYNC_SUCCESS", dailyActivity: synced.dailyActivity, stats: synced.stats });
    } catch (error) {
      dispatch({ type: "FAIL", message: error instanceof Error ? error.message : "位置情報の確認に失敗しました" });
    } finally {
      activationInFlightRef.current = false;
    }
  }, [repository]);

  const sync = useCallback(async () => {
    if (!state.dailyActivity) return;

    dispatch({ type: "SYNC_REQUEST" });
    try {
      const synced = await repository.syncLiveTerritory(state.dailyActivity.id);
      dispatch({ type: "SYNC_SUCCESS", dailyActivity: synced.dailyActivity, stats: synced.stats });
      return synced;
    } catch (error) {
      dispatch({ type: "FAIL", message: error instanceof Error ? error.message : "テリトリーを同期できませんでした" });
    }
  }, [repository, state.dailyActivity]);

  useEffect(() => {
    activate();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        activate();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [activate]);

  return {
    state,
    activate,
    sync,
    reset: () => dispatch({ type: "RESET" })
  };
}
