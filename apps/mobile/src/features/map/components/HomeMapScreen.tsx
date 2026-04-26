import { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import type { CompleteActivityResult } from "@/lib/repositories/terriRepository";
import type { FriendPresence, RankingEntry, TerritorySummary, UserProfile } from "@terri/shared";
import { MapSurface } from "@/components/map/MapSurface";
import { Avatar } from "@/components/ui/Avatar";
import { useTerriRepository } from "@/lib/repositories/RepositoryProvider";
import { formatPresenceUpdatedAt, getActiveFriendPresenceCount, getVisibleFriendPresences } from "@/features/friends/presence";
import { useTrackingSession } from "@/features/tracking/hooks/useTrackingSession";
import { colors } from "@/theme/tokens";
import { CompleteSheet } from "./CompleteSheet";
import { FriendsModal } from "./FriendsModal";
import { HistorySheet } from "./HistorySheet";
import { styles } from "./HomeMapScreen.styles";
import { RankingSheet } from "./RankingSheet";
import { StartDock } from "./StartDock";
import { TrackingControls } from "./TrackingControls";

type Overlay = "none" | "history" | "ranking" | "friends" | "complete";

export function HomeMapScreen() {
  const repository = useTerriRepository();
  const tracking = useTrackingSession();
  const [profile, setProfile] = useState<UserProfile | undefined>();
  const [friends, setFriends] = useState<FriendPresence[]>([]);
  const [activities, setActivities] = useState<TerritorySummary[]>([]);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [completion, setCompletion] = useState<CompleteActivityResult | undefined>();
  const [loadError, setLoadError] = useState<string | undefined>();

  useEffect(() => {
    let active = true;

    Promise.all([repository.getProfile(), repository.getFriends(), repository.getActivities(), repository.getRankings()])
      .then(([nextProfile, nextFriends, nextActivities, nextRankings]) => {
        if (!active) return;
        setProfile(nextProfile);
        setFriends(nextFriends);
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

  const isTracking = tracking.state.status === "tracking" || tracking.state.status === "stopping";
  const visibleFriends = useMemo(() => getVisibleFriendPresences(friends), [friends]);
  const mapFriends = useMemo(
    () =>
      visibleFriends.map((friend) => ({
        id: friend.id,
        displayName: friend.displayName,
        initials: friend.initials,
        color: friend.color,
        totalAreaKm2: friend.totalAreaKm2,
        isActive: friend.isActive,
        updatedLabel: formatPresenceUpdatedAt(friend),
        latitude: friend.position.latitude,
        longitude: friend.position.longitude
      })),
    [visibleFriends]
  );
  const activeFriendCount = useMemo(() => getActiveFriendPresenceCount(friends), [friends]);

  const handleStop = async () => {
    const result = await tracking.stop();
    if (result) {
      setCompletion(result);
      setOverlay("complete");
    }
  };

  return (
    <View style={styles.screen}>
      <MapSurface friends={mapFriends} activeFriendCount={activeFriendCount} tracking={isTracking} showRoute={isTracking} />
      <TouchableOpacity style={styles.profileButton} onPress={() => router.push("/profile")}>
        <Avatar initials={profile?.initials ?? "U"} color={profile?.territoryColor ?? colors.coral} size={58} active />
      </TouchableOpacity>
      {loadError ? <Text style={styles.errorBanner}>{loadError}</Text> : null}
      {isTracking ? (
        <TrackingControls stats={tracking.state.stats} stopping={tracking.state.status === "stopping"} onStop={handleStop} />
      ) : (
        <StartDock onHistory={() => setOverlay("history")} onStart={tracking.start} onRanking={() => setOverlay("ranking")} />
      )}
      {overlay === "history" ? <HistorySheet activities={activities} onClose={() => setOverlay("none")} /> : null}
      {overlay === "ranking" ? <RankingSheet rankings={rankings} onFriends={() => setOverlay("friends")} /> : null}
      {overlay === "friends" ? <FriendsModal friends={friends} onClose={() => setOverlay("none")} /> : null}
      {overlay === "complete" && completion ? <CompleteSheet result={completion} onClose={() => setOverlay("none")} /> : null}
    </View>
  );
}
