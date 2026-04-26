import type { TrackingStats } from "@terri/shared";

export type TrackingStatus = "idle" | "requestingPermission" | "tracking" | "stopping" | "completed" | "error";

export type TrackingState = {
  status: TrackingStatus;
  activityId?: string;
  stats: TrackingStats;
  errorMessage?: string;
};

export type TrackingAction =
  | { type: "REQUEST_PERMISSION" }
  | { type: "START"; activityId: string; stats: TrackingStats }
  | { type: "TICK"; stats: TrackingStats }
  | { type: "STOP_REQUEST" }
  | { type: "COMPLETE"; stats: TrackingStats }
  | { type: "FAIL"; message: string }
  | { type: "RESET" };

export const initialTrackingState: TrackingState = {
  status: "idle",
  stats: {
    elapsed: "00:00:00",
    distanceKm: 0,
    previewAreaKm2: 0
  }
};

export function trackingReducer(state: TrackingState, action: TrackingAction): TrackingState {
  switch (action.type) {
    case "REQUEST_PERMISSION":
      return { ...state, status: "requestingPermission", errorMessage: undefined };
    case "START":
      return { status: "tracking", activityId: action.activityId, stats: action.stats };
    case "TICK":
      return { ...state, stats: action.stats };
    case "STOP_REQUEST":
      return state.status === "tracking" ? { ...state, status: "stopping" } : state;
    case "COMPLETE":
      return { ...state, status: "completed", stats: action.stats };
    case "FAIL":
      return { ...state, status: "error", errorMessage: action.message };
    case "RESET":
      return initialTrackingState;
    default:
      return state;
  }
}

export function shouldSendLocationPoint(input: { secondsSinceLastSend: number; metersSinceLastSend: number }) {
  return input.secondsSinceLastSend >= 5 || input.metersSinceLastSend >= 10;
}

export function getLocationSendIntervalSeconds(input: { speedMps: number; lowSpeedDurationSeconds: number }) {
  return input.speedMps < 0.5 && input.lowSpeedDurationSeconds >= 30 ? 30 : 5;
}
