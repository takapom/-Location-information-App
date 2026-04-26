import { useReducer } from "react";
import { useTerriRepository } from "@/lib/repositories/RepositoryProvider";
import { initialTrackingState, trackingReducer } from "@/features/tracking/services/trackingState";

export function useTrackingSession() {
  const repository = useTerriRepository();
  const [state, dispatch] = useReducer(trackingReducer, initialTrackingState);

  const start = async () => {
    dispatch({ type: "REQUEST_PERMISSION" });
    try {
      const result = await repository.startActivity();
      dispatch({ type: "START", activityId: result.activityId, stats: result.initialStats });
    } catch (error) {
      dispatch({ type: "FAIL", message: error instanceof Error ? error.message : "トラッキングを開始できませんでした" });
    }
  };

  const stop = async () => {
    if (!state.activityId) {
      dispatch({ type: "FAIL", message: "アクティビティが開始されていません" });
      return;
    }
    dispatch({ type: "STOP_REQUEST" });
    try {
      const result = await repository.completeActivity(state.activityId);
      dispatch({ type: "COMPLETE", stats: result.stats });
      return result;
    } catch (error) {
      dispatch({ type: "FAIL", message: error instanceof Error ? error.message : "トラッキングを完了できませんでした" });
    }
  };

  return {
    state,
    start,
    stop,
    reset: () => dispatch({ type: "RESET" })
  };
}
