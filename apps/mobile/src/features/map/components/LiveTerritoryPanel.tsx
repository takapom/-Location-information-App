import { Text, TouchableOpacity, View } from "react-native";
import type { LiveTerritoryStats } from "@terri/shared";
import type { LiveTerritoryStatus } from "@/features/tracking/services/liveTerritoryState";
import { getLiveTerritoryStatusLabel } from "@/features/tracking/services/liveTerritoryState";
import { styles } from "./HomeMapScreen.styles";

type LiveTerritoryPanelProps = {
  stats: LiveTerritoryStats;
  status: LiveTerritoryStatus;
  onSync: () => void;
};

export function LiveTerritoryPanel({ stats, status, onSync }: LiveTerritoryPanelProps) {
  const syncing = status === "syncing" || status === "checkingPermission";

  return (
    <View style={styles.livePanel}>
      <View style={styles.statsCard}>
        <Stat label="状態" value={getLiveTerritoryStatusLabel(status)} icon="●" />
        <Divider />
        <Stat label="今日の距離" value={`${stats.distanceKm.toFixed(1)} km`} icon="👣" />
        <Divider />
        <Stat label="見込み" value={`${stats.previewAreaKm2.toFixed(2)} km²`} icon="⬚" />
      </View>
      <TouchableOpacity disabled={syncing} onPress={onSync} style={[styles.syncButton, syncing && { opacity: 0.7 }]}>
        <Text style={styles.syncText}>{syncing ? "同期中" : "今すぐ同期"}</Text>
      </TouchableOpacity>
    </View>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}
