import { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import type { FriendPresence, RankingEntry, TerritorySummary, UserProfile } from "@terri/shared";
import { MapSurface } from "@/components/map/MapSurface";
import { Avatar } from "@/components/ui/Avatar";
import { useTerriRepository } from "@/lib/repositories/RepositoryProvider";
import { formatPresenceUpdatedAt, getActiveFriendPresenceCount, getVisibleFriendPresences } from "@/features/friends/presence";
import { useLiveTerritory } from "@/features/tracking/hooks/useLiveTerritory";
import { getTerritoryCaptureSummary } from "@/features/tracking/services/liveTerritoryState";
import { colors } from "@/theme/tokens";
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
  const [activities, setActivities] = useState<TerritorySummary[]>([]);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [overlay, setOverlay] = useState<Overlay>("none");
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

  const isLive = liveTerritory.state.status === "live" || liveTerritory.state.status === "syncing";
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
  const currentLocation = liveTerritory.state.currentLocation;
  const currentUserMarker = useMemo(
    () => ({
      initials: profile?.initials ?? "U",
      color: profile?.territoryColor ?? colors.coral
    }),
    [profile]
  );

  return (
    <View style={styles.screen}>
      <View style={styles.mapLayer}>
        <MapSurface
          center={currentLocation}
          currentLocation={currentLocation}
          currentUser={currentUserMarker}
          friends={mapFriends}
          activeFriendCount={activeFriendCount}
          live={isLive}
          showRoute={isLive}
        />
      </View>
      <TouchableOpacity accessibilityRole="button" style={styles.profileButton} onPress={() => router.push("/profile")} testID="profile-button">
        <Avatar initials={profile?.initials ?? "U"} color={profile?.territoryColor ?? colors.coral} size={48} active />
      </TouchableOpacity>
      {loadError ? <Text style={styles.errorBanner}>{loadError}</Text> : null}
      {liveTerritory.state.errorMessage ? <Text style={styles.liveErrorBanner}>{liveTerritory.state.errorMessage}</Text> : null}
      <LiveTerritoryPanel stats={liveTerritory.state.stats} status={liveTerritory.state.status} onRequestPermission={liveTerritory.activate} onSync={liveTerritory.sync} />
      <StartDock
        captureLabel={getTerritoryCaptureSummary(liveTerritory.state.status)}
        captureStatus={liveTerritory.state.status}
        onHistory={() => setOverlay("history")}
        onRanking={() => setOverlay("ranking")}
      />
      {overlay === "history" ? <HistorySheet activities={activities} onClose={() => setOverlay("none")} /> : null}
      {overlay === "ranking" ? <RankingSheet rankings={rankings} onFriends={() => setOverlay("friends")} /> : null}
      {overlay === "friends" ? <FriendsModal friends={friends} onFriendsChange={setFriends} onClose={() => setOverlay("none")} /> : null}
    </View>
  );
}
