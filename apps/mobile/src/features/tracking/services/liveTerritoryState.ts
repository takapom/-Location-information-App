import type { DailyActivity, FinalizedDailyActivity, GeoPoint, LiveTerritoryStats, TerritoryGeometry, UserProfile } from "@terri/shared";
import type { MapPrivacyLabel } from "@/components/map/scene/mapPrivacyLabel";
import type { CurrentLocation } from "./locationReader";

export type LiveTerritoryStatus =
  | "checkingPermission"
  | "permissionDenied"
  | "live"
  | "syncing"
  | "finalizing"
  | "completed"
  | "pausedByPrivacy"
  | "backgroundLimited"
  | "error";

export type LiveTerritoryState = {
  status: LiveTerritoryStatus;
  dailyActivity?: DailyActivity;
  currentLocation?: CurrentLocation;
  trackingRoute: GeoPoint[];
  livePreviewGeometry?: TerritoryGeometry;
  finalizedResult?: FinalizedDailyActivity;
  stats: LiveTerritoryStats;
  errorMessage?: string;
};

export type LoopCaptureGuidance = {
  title: string;
  body: string;
  tone: "neutral" | "active" | "success" | "warning";
};

export type LiveTerritoryAction =
  | { type: "CHECK_PERMISSION" }
  | { type: "CURRENT_LOCATION_UPDATED"; currentLocation: CurrentLocation }
  | { type: "TRACKING_PREVIEW_UPDATED"; trackingRoute: GeoPoint[]; livePreviewGeometry?: TerritoryGeometry; previewAreaM2: number }
  | { type: "ACTIVITY_CHANGED" }
  | { type: "PERMISSION_GRANTED"; dailyActivity: DailyActivity; currentLocation: CurrentLocation }
  | { type: "PERMISSION_DENIED"; message: string }
  | { type: "SYNC_REQUEST" }
  | { type: "SYNC_SUCCESS"; dailyActivity: DailyActivity; stats: LiveTerritoryStats; livePreviewGeometry?: TerritoryGeometry }
  | { type: "FINALIZE_REQUEST" }
  | { type: "FINALIZE_SUCCESS"; result: FinalizedDailyActivity }
  | { type: "FINALIZE_FAIL"; message: string }
  | { type: "PAUSE_BY_PRIVACY"; message?: string }
  | { type: "BACKGROUND_LIMITED"; message?: string }
  | { type: "FAIL"; message: string }
  | { type: "RESET" };

export const initialLiveTerritoryState: LiveTerritoryState = {
  status: "checkingPermission",
  trackingRoute: [],
  stats: {
    elapsed: "確認中",
    distanceKm: 0,
    previewAreaKm2: 0
  }
};

export function liveTerritoryReducer(state: LiveTerritoryState, action: LiveTerritoryAction): LiveTerritoryState {
  switch (action.type) {
    case "CHECK_PERMISSION":
      if (state.status === "finalizing" || state.status === "completed") return state;
      return { ...state, status: "checkingPermission", errorMessage: undefined };
    case "CURRENT_LOCATION_UPDATED":
      if (state.status === "finalizing" || state.status === "completed") return state;
      return { ...state, currentLocation: action.currentLocation, errorMessage: undefined };
    case "TRACKING_PREVIEW_UPDATED":
      if (state.status === "finalizing" || state.status === "completed") return state;
      return {
        ...state,
        trackingRoute: action.trackingRoute,
        livePreviewGeometry: action.livePreviewGeometry,
        stats: {
          ...state.stats,
          previewAreaKm2: Number((action.previewAreaM2 / 1_000_000).toFixed(4))
        },
        errorMessage: undefined
      };
    case "ACTIVITY_CHANGED":
      return {
        ...state,
        trackingRoute: [],
        livePreviewGeometry: undefined,
        finalizedResult: undefined,
        stats: {
          ...state.stats,
          previewAreaKm2: 0
        },
        errorMessage: undefined
      };
    case "PERMISSION_GRANTED":
      return {
        ...state,
        status: "live",
        dailyActivity: action.dailyActivity,
        currentLocation: action.currentLocation,
        stats: {
          ...action.dailyActivity.stats,
          previewAreaKm2: Math.max(action.dailyActivity.stats.previewAreaKm2, state.stats.previewAreaKm2)
        },
        errorMessage: undefined
      };
    case "PERMISSION_DENIED":
      return { ...state, status: "permissionDenied", currentLocation: undefined, errorMessage: action.message };
    case "SYNC_REQUEST":
      return state.dailyActivity ? { ...state, status: "syncing", errorMessage: undefined } : state;
    case "SYNC_SUCCESS":
      if (state.status === "finalizing" || state.status === "completed") {
        return state;
      }
      return {
        ...state,
        status: "live",
        dailyActivity: action.dailyActivity,
        livePreviewGeometry: action.livePreviewGeometry,
        stats: {
          ...action.stats,
          previewAreaKm2: Math.max(action.stats.previewAreaKm2, state.stats.previewAreaKm2)
        }
      };
    case "FINALIZE_REQUEST":
      return state.dailyActivity ? { ...state, status: "finalizing", errorMessage: undefined } : state;
    case "FINALIZE_SUCCESS":
      return {
        ...state,
        status: "completed",
        dailyActivity: action.result.dailyActivity,
        finalizedResult: action.result,
        trackingRoute: [],
        livePreviewGeometry: undefined,
        stats: action.result.dailyActivity.stats,
        errorMessage: undefined
      };
    case "FINALIZE_FAIL":
      return state.dailyActivity ? { ...state, status: "live", errorMessage: action.message } : { ...state, status: "error", errorMessage: action.message };
    case "PAUSE_BY_PRIVACY":
      return { ...state, status: "pausedByPrivacy", errorMessage: action.message };
    case "BACKGROUND_LIMITED":
      return { ...state, status: "backgroundLimited", currentLocation: undefined, errorMessage: action.message };
    case "FAIL":
      if (state.status === "finalizing" || state.status === "completed") return state;
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
      return "OFF";
    case "live":
      return "ON";
    case "syncing":
      return "更新中";
    case "finalizing":
      return "確定中";
    case "completed":
      return "確定";
    case "pausedByPrivacy":
      return "一時停止";
    case "backgroundLimited":
      return "制限中";
    case "error":
      return "エラー";
    default:
      return "ON";
  }
}

export function getTerritoryCaptureSummary(status: LiveTerritoryStatus) {
  switch (status) {
    case "checkingPermission":
      return "確認中";
    case "permissionDenied":
      return "位置情報OFF";
    case "live":
      return "領土化ON";
    case "syncing":
      return "更新中";
    case "finalizing":
      return "確定中";
    case "completed":
      return "確定済み";
    case "pausedByPrivacy":
      return "一時停止";
    case "backgroundLimited":
      return "制限中";
    case "error":
      return "確認が必要";
    default:
      return "領土化ON";
  }
}

export function getLoopCaptureGuidance(input: {
  status: LiveTerritoryStatus;
  routePointCount: number;
  previewAreaKm2: number;
}): LoopCaptureGuidance {
  switch (input.status) {
    case "checkingPermission":
      return {
        title: "位置情報を確認中",
        body: "ONになると歩いた線を記録できます",
        tone: "neutral"
      };
    case "permissionDenied":
      return {
        title: "位置情報OFF",
        body: "許可すると線を引いてテリトリーを作れます",
        tone: "warning"
      };
    case "pausedByPrivacy":
      return {
        title: "領土化OFF",
        body: "ONにすると歩いた線の記録を再開します",
        tone: "warning"
      };
    case "backgroundLimited":
      return {
        title: "バックグラウンド制限中",
        body: "移動中も記録するには位置情報設定を確認してください",
        tone: "warning"
      };
    case "error":
      return {
        title: "確認が必要",
        body: "状態を更新できませんでした。もう一度試してください",
        tone: "warning"
      };
    case "completed":
      return {
        title: "今日のテリトリーを確定",
        body: "結果カードからシェアできます",
        tone: "success"
      };
    default:
      break;
  }

  if (input.previewAreaKm2 > 0) {
    return {
      title: "囲めた!",
      body: `今日のテリトリー +${input.previewAreaKm2.toFixed(2)} km²`,
      tone: "success"
    };
  }

  if (input.routePointCount > 0) {
    return {
      title: "線は記録中",
      body: "戻って囲むと内側がテリトリーになります",
      tone: "active"
    };
  }

  return {
    title: "歩き始めると線が残る",
    body: "ぐるっと囲めた場所が自分の色になります",
    tone: "neutral"
  };
}

export function getFinalizeButtonLabel(status: LiveTerritoryStatus) {
  if (status === "finalizing") return "確定中";
  if (status === "syncing") return "保存して結果を見る";
  return "今日を確定";
}

export function getMapPrivacyLabel(input: {
  profile?: Pick<UserProfile, "locationSharingEnabled" | "territoryCaptureEnabled">;
  status: LiveTerritoryStatus;
}): MapPrivacyLabel {
  if (input.status === "checkingPermission") return "確認中";
  if (input.status === "permissionDenied" || input.status === "backgroundLimited") return "位置情報OFF";
  if (!input.profile) return "確認中";
  if (!input.profile.territoryCaptureEnabled) return "領土化OFF";
  if (!input.profile.locationSharingEnabled) return "領土化だけON";
  return "友達に共有中";
}

export function shouldShowLocationPermissionPrompt(status: LiveTerritoryStatus) {
  return status === "permissionDenied" || status === "backgroundLimited";
}

export function canSyncLiveTerritoryStatus(status: LiveTerritoryStatus) {
  return status === "live" || status === "syncing";
}
