import { Text, TouchableOpacity, View } from "react-native";
import type { LiveTerritoryStatus } from "@/features/tracking/services/liveTerritoryState";
import { colors } from "@/theme/tokens";
import { styles } from "./HomeMapScreen.styles";

type StartDockProps = {
  captureLabel: string;
  captureStatus: LiveTerritoryStatus;
  onHistory: () => void;
  onRanking: () => void;
};

function getCaptureDotColor(status: LiveTerritoryStatus) {
  if (status === "permissionDenied" || status === "backgroundLimited" || status === "error") return colors.coral;
  if (status === "pausedByPrivacy") return colors.muted;
  return colors.mint;
}

export function StartDock({ captureLabel, captureStatus, onHistory, onRanking }: StartDockProps) {
  return (
    <View style={styles.startDock}>
      <TouchableOpacity accessibilityLabel="履歴を開く" accessibilityRole="button" onPress={onHistory} style={styles.dockSide} testID="history-button">
        <Text style={styles.dockIcon}>◷</Text>
      </TouchableOpacity>
      <View style={styles.captureStatus} testID="territory-capture-status">
        <Text style={[styles.captureStatusDot, { color: getCaptureDotColor(captureStatus) }]}>●</Text>
        <Text numberOfLines={1} style={styles.captureStatusText}>{captureLabel}</Text>
      </View>
      <TouchableOpacity accessibilityLabel="ランキングを開く" accessibilityRole="button" onPress={onRanking} style={styles.dockSide} testID="ranking-button">
        <Text style={styles.dockIcon}>🏆</Text>
      </TouchableOpacity>
    </View>
  );
}
