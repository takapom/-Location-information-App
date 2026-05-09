import { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import type { FinalizedDailyActivity, FriendPresence, FriendTerritory, RankingEntry, TerritorySummary, UserProfile } from "@terri/shared";
import { MapSurface } from "@/components/map/MapSurface";
import { readMapStyleConfig } from "@/components/map/config/mapStyleConfig";
import { Avatar } from "@/components/ui/Avatar";
import { useTerriRepository } from "@/lib/repositories/RepositoryProvider";
import { useFriendLivePresence } from "@/features/friends/hooks/useFriendLivePresence";
import { getActiveFriendPresenceCount, getVisibleFriendPresences } from "@/features/friends/presence";
import { useLiveTerritory } from "@/features/tracking/hooks/useLiveTerritory";
import { getTerritoryCaptureSummary } from "@/features/tracking/services/liveTerritoryState";
import { colors } from "@/theme/tokens";
import { buildHomeMapScene } from "../services/buildHomeMapScene";
import { CompleteSheet } from "./CompleteSheet";
import { FriendsModal } from "./FriendsModal";
import { HistorySheet } from "./HistorySheet";
import { styles } from "./HomeMapScreen.styles";
import { LiveTerritoryPanel } from "./LiveTerritoryPanel";
import { RankingSheet } from "./RankingSheet";
import { StartDock } from "./StartDock";

type Overlay = "none" | "history" | "ranking" | "friends";

export function HomeMapScreen() {
  const repository = useTerriRepository();
  const liveTerritory = useLiveTerritory();
  const [profile, setProfile] = useState<UserProfile | undefined>();
  const [friends, setFriends] = useState<FriendPresence[]>([]);
  const [friendTerritories, setFriendTerritories] = useState<FriendTerritory[]>([]);
  const [activities, setActivities] = useState<TerritorySummary[]>([]);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [completeResult, setCompleteResult] = useState<FinalizedDailyActivity | undefined>();
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [loadError, setLoadError] = useState<string | undefined>();

  useEffect(() => {
    let active = true;

    Promise.all([repository.getProfile(), repository.getFriends(), repository.getActivities(), repository.getRankings(), repository.getFriendTerritories()])
      .then(([nextProfile, nextFriends, nextActivities, nextRankings, nextFriendTerritories]) => {
        if (!active) return;
        setProfile(nextProfile);
        setFriends(nextFriends);
        setFriendTerritories(nextFriendTerritories);
        setActivities(nextActivities);
        setRankings(nextRankings);
        setLoadError(undefined);
      })
      .catch(() => {
        if (active) setLoadError("データを読み込めませんでした");
      });

    return () => {
      active = false;
    };
  }, [repository]);

  const isLive = liveTerritory.state.status === "live" || liveTerritory.state.status === "syncing" || liveTerritory.state.status === "finalizing";
  const liveFriends = useFriendLivePresence(friends);
  const visibleFriends = useMemo(() => getVisibleFriendPresences(liveFriends), [liveFriends]);
  const activeFriendCount = useMemo(() => getActiveFriendPresenceCount(liveFriends), [liveFriends]);
  const currentLocation = liveTerritory.state.currentLocation;
  const mapStyleConfig = useMemo(() => readMapStyleConfig(), []);
  const homeMapScene = useMemo(
    () =>
      buildHomeMapScene({
        profile,
        friends: visibleFriends,
        friendTerritories,
        currentLocation,
        activeFriendCount,
        isLive,
        showRoute: isLive || liveTerritory.state.status === "completed",
        attribution: mapStyleConfig.attribution,
        livePreviewGeometry: isLive ? liveTerritory.state.livePreviewGeometry : undefined,
        ownFinalTerritoryGeometries:
          liveTerritory.state.status === "completed"
            ? [liveTerritory.state.finalizedResult?.territory.polygon].filter((geometry) => geometry !== undefined)
            : [],
        trackingRoute: liveTerritory.state.trackingRoute
      }),
    [
      activeFriendCount,
      currentLocation,
      friendTerritories,
      isLive,
      liveTerritory.state.finalizedResult?.territory.polygon,
      liveTerritory.state.livePreviewGeometry,
      liveTerritory.state.status,
      liveTerritory.state.trackingRoute,
      mapStyleConfig.attribution,
      profile,
      visibleFriends
    ]
  );
  const finalizeTerritory = async () => {
    const finalized = await liveTerritory.finalize();
    if (finalized) {
      setCompleteResult(finalized);
      setActivities((previous) => [finalized.territory, ...previous.filter((activity) => activity.id !== finalized.territory.id)]);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.mapLayer}>
        <MapSurface scene={homeMapScene} />
      </View>
      <TouchableOpacity accessibilityRole="button" style={styles.profileButton} onPress={() => router.push("/profile")} testID="profile-button">
        <Avatar initials={profile?.initials ?? "U"} color={profile?.territoryColor ?? colors.coral} size={48} active />
      </TouchableOpacity>
      {loadError ? <Text style={styles.errorBanner}>{loadError}</Text> : null}
      {liveTerritory.state.errorMessage ? <Text style={styles.liveErrorBanner}>{liveTerritory.state.errorMessage}</Text> : null}
      <LiveTerritoryPanel
        stats={liveTerritory.state.stats}
        status={liveTerritory.state.status}
        onRequestPermission={liveTerritory.activate}
        onSync={liveTerritory.sync}
        onFinalize={() => void finalizeTerritory()}
      />
      <StartDock
        captureLabel={getTerritoryCaptureSummary(liveTerritory.state.status)}
        captureStatus={liveTerritory.state.status}
        onHistory={() => setOverlay("history")}
        onRanking={() => setOverlay("ranking")}
      />
      {overlay === "history" ? <HistorySheet activities={activities} onClose={() => setOverlay("none")} /> : null}
      {overlay === "ranking" ? <RankingSheet rankings={rankings} onClose={() => setOverlay("none")} onFriends={() => setOverlay("friends")} /> : null}
      {overlay === "friends" ? <FriendsModal friends={liveFriends} onFriendsChange={setFriends} onClose={() => setOverlay("none")} /> : null}
      {completeResult ? <CompleteSheet result={completeResult} onClose={() => setCompleteResult(undefined)} /> : null}
    </View>
  );
}
