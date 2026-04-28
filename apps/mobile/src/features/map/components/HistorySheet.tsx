import { Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import type { TerritorySummary } from "@terri/shared";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Pill } from "@/components/ui/Pill";
import { styles } from "./HomeMapScreen.styles";

type HistorySheetProps = {
  activities: TerritorySummary[];
  onClose: () => void;
};

export function HistorySheet({ activities, onClose }: HistorySheetProps) {
  return (
    <BottomSheet height="56%">
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>履歴</Text>
        <TouchableOpacity accessibilityLabel="履歴を閉じる" accessibilityRole="button" onPress={onClose} style={styles.closeCircle} testID="history-close-button">
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
      </View>
      {activities.map((activity) => (
        <TouchableOpacity accessibilityRole="button" key={activity.id} onPress={() => router.push(`/activity/${activity.id}`)} style={styles.historyCard} testID={`activity-card-${activity.id}`}>
          <View style={[styles.mapThumb, { borderColor: activity.color }]}>
            <View style={[styles.thumbTerritory, { backgroundColor: `${activity.color}66`, borderColor: activity.color }]} />
          </View>
          <View style={styles.historyBody}>
            <Text style={styles.historyTitle}>{activity.createdAtLabel}</Text>
            <View style={styles.historyPills}>
              <Pill>{activity.distanceKm.toFixed(1)}km 🏃</Pill>
              <Pill tone="mint">{activity.areaKm2.toFixed(1)}km² 🗺</Pill>
            </View>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </BottomSheet>
  );
}
