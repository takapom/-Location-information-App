import { useCallback, useEffect, useReducer } from "react";
import { useTerriRepository } from "@/lib/repositories/RepositoryProvider";
import { getLocalDateForTimezone, initialLiveTerritoryState, liveTerritoryReducer } from "@/features/tracking/services/liveTerritoryState";

function getDeviceTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function useLiveTerritory() {
  const repository = useTerriRepository();
  const [state, dispatch] = useReducer(liveTerritoryReducer, initialLiveTerritoryState);

  const activate = useCallback(async () => {
    dispatch({ type: "CHECK_PERMISSION" });
    try {
      const profile = await repository.getProfile();
      if (!profile.territoryCaptureEnabled) {
        dispatch({ type: "PAUSE_BY_PRIVACY", message: "テリトリー生成がOFFです" });
        return;
      }

      const timezone = getDeviceTimezone();
      const dailyActivity = await repository.ensureDailyActivity({
        localDate: getLocalDateForTimezone(new Date(), timezone),
        timezone
      });
      dispatch({ type: "PERMISSION_GRANTED", dailyActivity });

      const synced = await repository.syncLiveTerritory(dailyActivity.id);
      dispatch({ type: "SYNC_SUCCESS", dailyActivity: synced.dailyActivity, stats: synced.stats });
    } catch (error) {
      dispatch({ type: "FAIL", message: error instanceof Error ? error.message : "LIVE状態を開始できませんでした" });
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
  }, [activate]);

  return {
    state,
    activate,
    sync,
    reset: () => dispatch({ type: "RESET" })
  };
}
