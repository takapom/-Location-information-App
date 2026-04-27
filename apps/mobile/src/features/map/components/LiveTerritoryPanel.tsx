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
        <Stat label="状態" value={getLiveTerritoryStatusLabel(status)} />
        <Divider />
        <Stat label="距離" value={`${stats.distanceKm.toFixed(1)} km`} />
        <Divider />
        <Stat label="面積" value={`${stats.previewAreaKm2.toFixed(2)} km²`} />
        <TouchableOpacity disabled={syncing} onPress={onSync} style={[styles.syncButton, syncing && { opacity: 0.7 }]}>
          <Text style={styles.syncText}>{syncing ? "同期中" : "同期"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}
