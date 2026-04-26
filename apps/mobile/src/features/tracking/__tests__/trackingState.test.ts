import { getLocationSendIntervalSeconds, initialTrackingState, shouldSendLocationPoint, trackingReducer } from "@/features/tracking/services/trackingState";

describe("trackingReducer", () => {
  test("idleからtrackingへ明示的に遷移する", () => {
    const requesting = trackingReducer(initialTrackingState, { type: "REQUEST_PERMISSION" });
    const tracking = trackingReducer(requesting, {
      type: "START",
      activityId: "activity-1",
      stats: { elapsed: "00:00:05", distanceKm: 0.02, previewAreaKm2: 0.001 }
    });

    expect(requesting.status).toBe("requestingPermission");
    expect(tracking.status).toBe("tracking");
    expect(tracking.activityId).toBe("activity-1");
  });

  test("STOP要求はtracking中だけstoppingへ進む", () => {
    const idleStop = trackingReducer(initialTrackingState, { type: "STOP_REQUEST" });
    const tracking = trackingReducer(initialTrackingState, {
      type: "START",
      activityId: "activity-1",
      stats: initialTrackingState.stats
    });
    const stopping = trackingReducer(tracking, { type: "STOP_REQUEST" });

    expect(idleStop.status).toBe("idle");
    expect(stopping.status).toBe("stopping");
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
