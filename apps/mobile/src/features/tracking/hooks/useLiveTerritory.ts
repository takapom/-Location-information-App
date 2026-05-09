import { useCallback, useEffect, useReducer, useRef } from "react";
import { AppState } from "react-native";
import type { UserProfile } from "@terri/shared";
import { createFriendLivePresencePayload, shouldPublishFriendLivePresence } from "@/features/friends/services/livePresence";
import { useTerriPresenceClient } from "@/lib/realtime/PresenceProvider";
import { useTerriRepository } from "@/lib/repositories/RepositoryProvider";
import { canSyncLiveTerritoryStatus, getLocalDateForTimezone, initialLiveTerritoryState, liveTerritoryReducer } from "@/features/tracking/services/liveTerritoryState";
import { requestTerritoryLocationPermission } from "@/features/tracking/services/locationPermission";
import { getCurrentTerritoryLocation, type CurrentLocation } from "@/features/tracking/services/locationReader";
import { startTerritoryLocationWatcher, type LocationWatcherSubscription } from "@/features/tracking/services/locationWatcher";
import { buildLoopTerritoryPreview } from "@/features/tracking/services/loopTerritory";
import { shouldSendTrackedLocation } from "@/features/tracking/services/trackingPolicy";

function getDeviceTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function useLiveTerritory() {
  const repository = useTerriRepository();
  const presenceClient = useTerriPresenceClient();
  const [state, dispatch] = useReducer(liveTerritoryReducer, initialLiveTerritoryState);
  const activationInFlightRef = useRef(false);
  const watcherSubscriptionRef = useRef<LocationWatcherSubscription | undefined>(undefined);
  const lastSentLocationRef = useRef<CurrentLocation | undefined>(undefined);
  const lastSyncAtMsRef = useRef<number | undefined>(undefined);
  const lastPresencePublishedAtMsRef = useRef<number | undefined>(undefined);
  const syncInFlightRef = useRef(false);
  const profileRef = useRef<UserProfile | undefined>(undefined);
  const acceptedRouteRef = useRef<CurrentLocation[]>([]);
  const activeActivityIdRef = useRef<string | undefined>(undefined);
  const finalizingRef = useRef(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
    finalizingRef.current = state.status === "finalizing" || state.status === "completed";
  }, [state]);

  const stopWatcher = useCallback(() => {
    watcherSubscriptionRef.current?.remove();
    watcherSubscriptionRef.current = undefined;
  }, []);

  const clearOwnPresence = useCallback(() => {
    const profile = profileRef.current;
    if (!profile) return;
    lastPresencePublishedAtMsRef.current = undefined;
    presenceClient.clearOwnPresence(profile.id).catch(() => undefined);
  }, [presenceClient]);

  const resetTrackingSession = useCallback((activityId?: string) => {
    acceptedRouteRef.current = [];
    lastSentLocationRef.current = undefined;
    lastSyncAtMsRef.current = undefined;
    activeActivityIdRef.current = activityId;
    dispatch({ type: "ACTIVITY_CHANGED" });
  }, []);

  const publishOwnPresence = useCallback(
    async (location: CurrentLocation, force = false) => {
      const nowMs = Date.now();
      if (!shouldPublishFriendLivePresence({ lastPublishedAtMs: lastPresencePublishedAtMsRef.current, nowMs, force })) return;

      let profile = profileRef.current;
      try {
        profile = await repository.getProfile();
        profileRef.current = profile;
      } catch {
        clearOwnPresence();
        return;
      }

      const payload = createFriendLivePresencePayload({
        profile,
        currentLocation: location,
        isActive: true
      });
      if (!payload) {
        clearOwnPresence();
        return;
      }

      await presenceClient.publishOwnPresence(payload);
      lastPresencePublishedAtMsRef.current = nowMs;
    },
    [clearOwnPresence, presenceClient, repository]
  );

  const appendTrackedLocation = useCallback(
    async (dailyActivityId: string, location: CurrentLocation) => {
      if (finalizingRef.current || activeActivityIdRef.current !== dailyActivityId) return false;
      if (!shouldSendTrackedLocation({ currentLocation: location, lastSentLocation: lastSentLocationRef.current })) return false;

      await repository.appendLocationPoint({
        dailyActivityId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracyM: location.accuracyM,
        speedMps: location.speedMps,
        recordedAt: location.recordedAt
      });
      if (finalizingRef.current || activeActivityIdRef.current !== dailyActivityId) return false;
      lastSentLocationRef.current = location;
      acceptedRouteRef.current = [...acceptedRouteRef.current, location];
      const preview = buildLoopTerritoryPreview(acceptedRouteRef.current);
      dispatch({
        type: "TRACKING_PREVIEW_UPDATED",
        trackingRoute: preview.route,
        livePreviewGeometry: preview.geometry,
        previewAreaM2: preview.areaM2
      });
      return true;
    },
    [repository]
  );

  const syncIfDue = useCallback(
    async (dailyActivityId: string, nowMs = Date.now()) => {
      if (finalizingRef.current) return;
      if (activeActivityIdRef.current !== dailyActivityId) return;
      if (!canSyncLiveTerritoryStatus(stateRef.current.status)) return;
      if (lastSyncAtMsRef.current !== undefined && nowMs - lastSyncAtMsRef.current < 30_000) return;
      if (syncInFlightRef.current) return;

      syncInFlightRef.current = true;
      try {
        const synced = await repository.syncLiveTerritory(dailyActivityId);
        if (finalizingRef.current || activeActivityIdRef.current !== dailyActivityId) return;
        lastSyncAtMsRef.current = nowMs;
        dispatch({ type: "SYNC_SUCCESS", dailyActivity: synced.dailyActivity, stats: synced.stats, livePreviewGeometry: synced.territory.polygon });
      } finally {
        syncInFlightRef.current = false;
      }
    },
    [repository]
  );

  const startWatcher = useCallback(
    async (dailyActivityId: string) => {
      stopWatcher();
      watcherSubscriptionRef.current = await startTerritoryLocationWatcher({
        onLocation: async (location) => {
          if (finalizingRef.current || activeActivityIdRef.current !== dailyActivityId) return;
          dispatch({ type: "CURRENT_LOCATION_UPDATED", currentLocation: location });
          publishOwnPresence(location).catch(() => undefined);
          const appended = await appendTrackedLocation(dailyActivityId, location);
          if (appended) {
            await syncIfDue(dailyActivityId);
          }
        },
        onError: (error) => {
          if (finalizingRef.current || activeActivityIdRef.current !== dailyActivityId) return;
          dispatch({ type: "FAIL", message: error instanceof Error ? error.message : "位置情報の更新に失敗しました" });
        }
      });
    },
    [appendTrackedLocation, publishOwnPresence, stopWatcher, syncIfDue]
  );

  const activate = useCallback(async () => {
    if (stateRef.current.status === "finalizing" || stateRef.current.status === "completed") return;
    if (activationInFlightRef.current) return;
    activationInFlightRef.current = true;
    dispatch({ type: "CHECK_PERMISSION" });
    try {
      const permission = await requestTerritoryLocationPermission();
      if (permission === "denied") {
        stopWatcher();
        dispatch({ type: "PERMISSION_DENIED", message: "位置情報がOFFです" });
        return;
      }
      if (permission === "servicesDisabled") {
        stopWatcher();
        dispatch({ type: "BACKGROUND_LIMITED", message: "端末の位置情報サービスがOFFです" });
        return;
      }
      if (permission === "unavailable") {
        stopWatcher();
        dispatch({ type: "BACKGROUND_LIMITED", message: "この環境では位置情報を取得できません" });
        return;
      }

      const currentLocation = await getCurrentTerritoryLocation().catch(() => undefined);
      if (!currentLocation) {
        stopWatcher();
        dispatch({ type: "BACKGROUND_LIMITED", message: "現在地を取得できません" });
        return;
      }
      dispatch({ type: "CURRENT_LOCATION_UPDATED", currentLocation });

      const profile = await repository.getProfile();
      profileRef.current = profile;
      if (!profile.territoryCaptureEnabled) {
        stopWatcher();
        clearOwnPresence();
        dispatch({ type: "PAUSE_BY_PRIVACY", message: "テリトリー生成がOFFです" });
        return;
      }

      const timezone = getDeviceTimezone();
      const dailyActivity = await repository.ensureDailyActivity({
        localDate: getLocalDateForTimezone(new Date(), timezone),
        timezone
      });
      if (dailyActivity.status === "finalized") {
        resetTrackingSession(dailyActivity.id);
        stopWatcher();
        clearOwnPresence();
        const territory = await repository.getActivity(dailyActivity.id);
        dispatch({ type: "FINALIZE_SUCCESS", result: { dailyActivity, territory } });
        return;
      }

      publishOwnPresence(currentLocation, true).catch(() => undefined);

      if (activeActivityIdRef.current !== dailyActivity.id) {
        resetTrackingSession(dailyActivity.id);
      }
      dispatch({ type: "PERMISSION_GRANTED", dailyActivity, currentLocation });
      await appendTrackedLocation(dailyActivity.id, currentLocation);

      const synced = await repository.syncLiveTerritory(dailyActivity.id);
      if (finalizingRef.current || activeActivityIdRef.current !== dailyActivity.id) return;
      lastSyncAtMsRef.current = Date.now();
      dispatch({ type: "SYNC_SUCCESS", dailyActivity: synced.dailyActivity, stats: synced.stats, livePreviewGeometry: synced.territory.polygon });
      await startWatcher(dailyActivity.id);
    } catch (error) {
      dispatch({ type: "FAIL", message: error instanceof Error ? error.message : "位置情報の確認に失敗しました" });
    } finally {
      activationInFlightRef.current = false;
    }
  }, [appendTrackedLocation, clearOwnPresence, publishOwnPresence, repository, resetTrackingSession, startWatcher, stopWatcher]);

  const sync = useCallback(async () => {
    if (!state.dailyActivity) return;
    if (finalizingRef.current) return;
    if (!canSyncLiveTerritoryStatus(state.status)) return;

    dispatch({ type: "SYNC_REQUEST" });
    try {
      const synced = await repository.syncLiveTerritory(state.dailyActivity.id);
      if (finalizingRef.current || activeActivityIdRef.current !== state.dailyActivity.id) return;
      lastSyncAtMsRef.current = Date.now();
      dispatch({ type: "SYNC_SUCCESS", dailyActivity: synced.dailyActivity, stats: synced.stats, livePreviewGeometry: synced.territory.polygon });
      return synced;
    } catch (error) {
      dispatch({ type: "FAIL", message: error instanceof Error ? error.message : "テリトリーを同期できませんでした" });
    }
  }, [repository, state.dailyActivity, state.status]);

  const finalize = useCallback(async () => {
    if (!state.dailyActivity) return;
    if (finalizingRef.current) return;
    if (!canSyncLiveTerritoryStatus(state.status)) return;

    finalizingRef.current = true;
    stopWatcher();
    dispatch({ type: "FINALIZE_REQUEST" });
    try {
      const finalized = await repository.finalizeDailyActivity(state.dailyActivity.id);
      clearOwnPresence();
      dispatch({ type: "FINALIZE_SUCCESS", result: finalized });
      return finalized;
    } catch (error) {
      finalizingRef.current = false;
      dispatch({ type: "FINALIZE_FAIL", message: error instanceof Error ? error.message : "テリトリーを確定できませんでした" });
    }
  }, [clearOwnPresence, repository, state.dailyActivity, state.status, stopWatcher]);

  useEffect(() => {
    activate();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        activate();
      }
    });

    return () => {
      subscription.remove();
      stopWatcher();
      clearOwnPresence();
    };
  }, [activate, clearOwnPresence, stopWatcher]);

  return {
    state,
    activate,
    sync,
    finalize,
    reset: () => {
      stopWatcher();
      clearOwnPresence();
      lastSentLocationRef.current = undefined;
      acceptedRouteRef.current = [];
      lastSyncAtMsRef.current = undefined;
      activeActivityIdRef.current = undefined;
      lastPresencePublishedAtMsRef.current = undefined;
      syncInFlightRef.current = false;
      finalizingRef.current = false;
      dispatch({ type: "RESET" });
    }
  };
}
