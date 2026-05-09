import {
  getLocationSendIntervalSeconds,
  getLocalDateForTimezone,
  getTerritoryCaptureSummary,
  initialLiveTerritoryState,
  liveTerritoryReducer,
  shouldShowLocationPermissionPrompt,
  shouldSendLocationPoint
} from "@/features/tracking/services/liveTerritoryState";

const dailyActivity = {
  id: "daily-2026-04-26",
  localDate: "2026-04-26",
  timezone: "Asia/Tokyo",
  status: "open" as const,
  stats: { elapsed: "進行中", distanceKm: 0.2, previewAreaKm2: 0.01 }
};

const currentLocation = {
  latitude: 35.66,
  longitude: 139.7,
  accuracyM: 12,
  recordedAt: "2026-04-26T03:00:00.000Z"
};

const polygon = {
  type: "Polygon" as const,
  coordinates: [
    [
      [139.7, 35.66],
      [139.701, 35.66],
      [139.701, 35.661],
      [139.7, 35.66]
    ]
  ]
};

describe("liveTerritoryReducer", () => {
  test("権限確認後に領土化ON状態へ遷移する", () => {
    const checking = liveTerritoryReducer(initialLiveTerritoryState, { type: "CHECK_PERMISSION" });
    const live = liveTerritoryReducer(checking, { type: "PERMISSION_GRANTED", dailyActivity, currentLocation });

    expect(checking.status).toBe("checkingPermission");
    expect(live.status).toBe("live");
    expect(live.dailyActivity?.id).toBe("daily-2026-04-26");
    expect(live.currentLocation).toEqual(currentLocation);
  });

  test("テリトリー生成OFFはpausedByPrivacyとして扱う", () => {
    const paused = liveTerritoryReducer(initialLiveTerritoryState, {
      type: "PAUSE_BY_PRIVACY",
      message: "テリトリー生成がOFFです"
    });

    expect(paused.status).toBe("pausedByPrivacy");
    expect(paused.errorMessage).toBe("テリトリー生成がOFFです");
  });

  test("同期要求はdailyActivityがある場合だけsyncingへ進む", () => {
    const withoutActivity = liveTerritoryReducer(initialLiveTerritoryState, { type: "SYNC_REQUEST" });
    const live = liveTerritoryReducer(initialLiveTerritoryState, { type: "PERMISSION_GRANTED", dailyActivity, currentLocation });
    const syncing = liveTerritoryReducer(live, { type: "SYNC_REQUEST" });

    expect(withoutActivity.status).toBe("checkingPermission");
    expect(syncing.status).toBe("syncing");
  });

  test("同期成功はサーバーpolygonをlive previewへ反映する", () => {
    const live = liveTerritoryReducer(initialLiveTerritoryState, { type: "PERMISSION_GRANTED", dailyActivity, currentLocation });
    const syncing = liveTerritoryReducer(live, { type: "SYNC_REQUEST" });
    const synced = liveTerritoryReducer(syncing, {
      type: "SYNC_SUCCESS",
      dailyActivity,
      stats: { elapsed: "進行中", distanceKm: 0.4, previewAreaKm2: 0.02 },
      livePreviewGeometry: polygon
    });

    expect(synced.status).toBe("live");
    expect(synced.livePreviewGeometry).toEqual(polygon);
  });

  test("最終化中と完了後の古い同期成功は状態をliveへ戻さない", () => {
    const live = liveTerritoryReducer(initialLiveTerritoryState, { type: "PERMISSION_GRANTED", dailyActivity, currentLocation });
    const finalizing = liveTerritoryReducer(live, { type: "FINALIZE_REQUEST" });
    const afterFinalizingSync = liveTerritoryReducer(finalizing, {
      type: "SYNC_SUCCESS",
      dailyActivity,
      stats: dailyActivity.stats,
      livePreviewGeometry: polygon
    });
    const completed = liveTerritoryReducer(live, {
      type: "FINALIZE_SUCCESS",
      result: {
        dailyActivity,
        territory: {
          id: "today",
          title: "今日",
          areaKm2: 0.02,
          distanceKm: 0.4,
          duration: "完了",
          color: "#F07060",
          createdAtLabel: "今日",
          polygon
        }
      }
    });
    const afterCompletedSync = liveTerritoryReducer(completed, {
      type: "SYNC_SUCCESS",
      dailyActivity,
      stats: dailyActivity.stats,
      livePreviewGeometry: polygon
    });

    expect(afterFinalizingSync.status).toBe("finalizing");
    expect(afterCompletedSync.status).toBe("completed");
  });

  test("確定失敗はfinalizingに残さずliveへ戻して再試行できる", () => {
    const live = liveTerritoryReducer(initialLiveTerritoryState, { type: "PERMISSION_GRANTED", dailyActivity, currentLocation });
    const finalizing = liveTerritoryReducer(live, { type: "FINALIZE_REQUEST" });
    const failed = liveTerritoryReducer(finalizing, { type: "FINALIZE_FAIL", message: "テリトリーを確定できませんでした" });

    expect(failed.status).toBe("live");
    expect(failed.dailyActivity).toEqual(dailyActivity);
    expect(failed.errorMessage).toBe("テリトリーを確定できませんでした");
  });

  test("活動切り替えと確定成功でpreview状態を消す", () => {
    const previewing = liveTerritoryReducer(initialLiveTerritoryState, {
      type: "TRACKING_PREVIEW_UPDATED",
      trackingRoute: [currentLocation],
      livePreviewGeometry: polygon,
      previewAreaM2: 20_000
    });
    const changed = liveTerritoryReducer(previewing, { type: "ACTIVITY_CHANGED" });
    const completed = liveTerritoryReducer(previewing, {
      type: "FINALIZE_SUCCESS",
      result: {
        dailyActivity,
        territory: {
          id: "today",
          title: "今日",
          areaKm2: 0.02,
          distanceKm: 0.4,
          duration: "完了",
          color: "#F07060",
          createdAtLabel: "今日",
          polygon
        }
      }
    });

    expect(changed.trackingRoute).toEqual([]);
    expect(changed.livePreviewGeometry).toBeUndefined();
    expect(changed.stats.previewAreaKm2).toBe(0);
    expect(completed.trackingRoute).toEqual([]);
    expect(completed.livePreviewGeometry).toBeUndefined();
  });

  test("位置情報を取得できない状態では古い現在地を残さない", () => {
    const live = liveTerritoryReducer(initialLiveTerritoryState, { type: "PERMISSION_GRANTED", dailyActivity, currentLocation });
    const denied = liveTerritoryReducer(live, { type: "PERMISSION_DENIED", message: "位置情報をオンにしてください" });
    const limited = liveTerritoryReducer(live, { type: "BACKGROUND_LIMITED", message: "現在地を取得できません" });

    expect(denied.currentLocation).toBeUndefined();
    expect(limited.currentLocation).toBeUndefined();
  });

  test("現在地表示はDB同期状態から独立して更新できる", () => {
    const located = liveTerritoryReducer(initialLiveTerritoryState, { type: "CURRENT_LOCATION_UPDATED", currentLocation });
    const failed = liveTerritoryReducer(located, { type: "FAIL", message: "同期に失敗しました" });

    expect(located.currentLocation).toEqual(currentLocation);
    expect(failed.status).toBe("error");
    expect(failed.currentLocation).toEqual(currentLocation);
  });
});

describe("territory capture labels", () => {
  test("ユーザー向け文言ではLIVEではなく領土化と位置情報を表示する", () => {
    expect(getTerritoryCaptureSummary("live")).toBe("領土化ON");
    expect(getTerritoryCaptureSummary("permissionDenied")).toBe("位置情報OFF");
    expect(shouldShowLocationPermissionPrompt("permissionDenied")).toBe(true);
    expect(shouldShowLocationPermissionPrompt("live")).toBe(false);
  });
});

describe("shouldSendLocationPoint", () => {
  test("5秒経過または10m移動で送信対象にする", () => {
    expect(shouldSendLocationPoint({ secondsSinceLastSend: 5, metersSinceLastSend: 0 })).toBe(true);
    expect(shouldSendLocationPoint({ secondsSinceLastSend: 2, metersSinceLastSend: 10 })).toBe(true);
    expect(shouldSendLocationPoint({ secondsSinceLastSend: 2, metersSinceLastSend: 4 })).toBe(false);
  });
});

describe("getLocationSendIntervalSeconds", () => {
  test("低速状態が30秒続いたら送信間隔を30秒へ落とす", () => {
    expect(getLocationSendIntervalSeconds({ speedMps: 0.4, lowSpeedDurationSeconds: 29 })).toBe(5);
    expect(getLocationSendIntervalSeconds({ speedMps: 0.4, lowSpeedDurationSeconds: 30 })).toBe(30);
    expect(getLocationSendIntervalSeconds({ speedMps: 0.6, lowSpeedDurationSeconds: 45 })).toBe(5);
  });
});

describe("getLocalDateForTimezone", () => {
  test("端末timezoneのカレンダー日付を返す", () => {
    const now = new Date("2026-04-26T15:30:00.000Z");

    expect(getLocalDateForTimezone(now, "Asia/Tokyo")).toBe("2026-04-27");
    expect(getLocalDateForTimezone(now, "America/Los_Angeles")).toBe("2026-04-26");
  });
});
