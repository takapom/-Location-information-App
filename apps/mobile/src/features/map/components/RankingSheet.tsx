import { Text, View } from "react-native";
import type { RankingEntry } from "@terri/shared";
import { Avatar } from "@/components/ui/Avatar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Pill } from "@/components/ui/Pill";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { styles } from "./HomeMapScreen.styles";

type RankingSheetProps = {
  rankings: RankingEntry[];
  onFriends: () => void;
};

function formatSignedDelta(deltaKm2: number) {
  if (deltaKm2 > 0) return `+${deltaKm2.toFixed(1)}`;
  if (deltaKm2 < 0) return deltaKm2.toFixed(1);
  return "±0.0";
}

export function getWeeklyDeltaLabel(deltaKm2: number) {
  return `先週比${formatSignedDelta(deltaKm2)}`;
}

export function getWeeklyDeltaTone(deltaKm2: number): "coral" | "mint" | "neutral" {
  if (deltaKm2 > 0) return "mint";
  if (deltaKm2 < 0) return "coral";
  return "neutral";
}

export function RankingSheet({ rankings, onFriends }: RankingSheetProps) {
  const topThree = rankings.slice(0, 3);

  return (
    <BottomSheet height="64%">
      <Text style={styles.rankingTitle}>🏆 フレンドランキング</Text>
      <View style={styles.podium}>
        {topThree.map((entry) => (
          <View key={entry.id} style={[styles.podiumCard, entry.rank === 1 && styles.podiumFirst]}>
            <Text style={styles.crown}>{entry.rank === 1 ? "👑" : entry.rank === 2 ? "🥈" : "🥉"}</Text>
            <Avatar initials={entry.initials} color={entry.color} size={entry.rank === 1 ? 76 : 64} />
            <Text style={styles.podiumName}>{entry.name}</Text>
            <Text style={styles.podiumArea}>{entry.areaKm2.toFixed(1)} km²</Text>
            <Pill tone={getWeeklyDeltaTone(entry.deltaKm2)}>{getWeeklyDeltaLabel(entry.deltaKm2)}</Pill>
          </View>
        ))}
      </View>
      {rankings.map((entry) => (
        <View key={`row-${entry.id}`} style={[styles.rankRow, entry.isCurrentUser && styles.youRow]}>
          <Text style={styles.rankIndex}>{entry.isCurrentUser ? "You" : `#${entry.rank}`}</Text>
          <Text style={styles.rankName}>{entry.name}</Text>
          <Text style={styles.rankArea}>{entry.areaKm2.toFixed(1)}km²</Text>
          <Pill tone={getWeeklyDeltaTone(entry.deltaKm2)}>{formatSignedDelta(entry.deltaKm2)}</Pill>
        </View>
      ))}
      <PrimaryButton onPress={onFriends} testID="ranking-friends-button">👥 友達を追加</PrimaryButton>
    </BottomSheet>
  );
}
