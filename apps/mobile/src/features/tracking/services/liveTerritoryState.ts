import type { DailyActivity, LiveTerritoryStats } from "@terri/shared";

export type LiveTerritoryStatus =
  | "checkingPermission"
  | "permissionDenied"
  | "live"
  | "syncing"
  | "pausedByPrivacy"
  | "backgroundLimited"
  | "error";

export type LiveTerritoryState = {
  status: LiveTerritoryStatus;
  dailyActivity?: DailyActivity;
  stats: LiveTerritoryStats;
  errorMessage?: string;
};

export type LiveTerritoryAction =
  | { type: "CHECK_PERMISSION" }
  | { type: "PERMISSION_GRANTED"; dailyActivity: DailyActivity }
  | { type: "PERMISSION_DENIED"; message: string }
  | { type: "SYNC_REQUEST" }
  | { type: "SYNC_SUCCESS"; dailyActivity: DailyActivity; stats: LiveTerritoryStats }
  | { type: "PAUSE_BY_PRIVACY"; message?: string }
  | { type: "BACKGROUND_LIMITED"; message?: string }
  | { type: "FAIL"; message: string }
  | { type: "RESET" };

export const initialLiveTerritoryState: LiveTerritoryState = {
  status: "checkingPermission",
  stats: {
    elapsed: "LIVE",
    distanceKm: 0,
    previewAreaKm2: 0
  }
};

export function liveTerritoryReducer(state: LiveTerritoryState, action: LiveTerritoryAction): LiveTerritoryState {
  switch (action.type) {
    case "CHECK_PERMISSION":
      return { ...state, status: "checkingPermission", errorMessage: undefined };
    case "PERMISSION_GRANTED":
      return { status: "live", dailyActivity: action.dailyActivity, stats: action.dailyActivity.stats };
    case "PERMISSION_DENIED":
      return { ...state, status: "permissionDenied", errorMessage: action.message };
    case "SYNC_REQUEST":
      return state.dailyActivity ? { ...state, status: "syncing", errorMessage: undefined } : state;
    case "SYNC_SUCCESS":
      return { status: "live", dailyActivity: action.dailyActivity, stats: action.stats };
    case "PAUSE_BY_PRIVACY":
      return { ...state, status: "pausedByPrivacy", errorMessage: action.message };
    case "BACKGROUND_LIMITED":
      return { ...state, status: "backgroundLimited", errorMessage: action.message };
    case "FAIL":
      return { ...state, status: "error", errorMessage: action.message };
    case "RESET":
      return initialLiveTerritoryState;
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

export function getLocalDateForTimezone(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export function getLiveTerritoryStatusLabel(status: LiveTerritoryStatus) {
  switch (status) {
    case "checkingPermission":
      return "確認中";
    case "permissionDenied":
      return "位置情報OFF";
    case "live":
      return "LIVE";
    case "syncing":
      return "同期中";
    case "pausedByPrivacy":
      return "生成OFF";
    case "backgroundLimited":
      return "制限中";
    case "error":
      return "エラー";
    default:
      return "LIVE";
  }
}
