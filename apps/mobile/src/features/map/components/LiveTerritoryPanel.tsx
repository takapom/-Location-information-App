import { Linking, Platform, Text, TouchableOpacity, View } from "react-native";
import type { LiveTerritoryStats } from "@terri/shared";
import type { LiveTerritoryStatus } from "@/features/tracking/services/liveTerritoryState";
import { getLiveTerritoryStatusLabel, shouldShowLocationPermissionPrompt } from "@/features/tracking/services/liveTerritoryState";
import { styles } from "./HomeMapScreen.styles";

type LiveTerritoryPanelProps = {
  stats: LiveTerritoryStats;
  status: LiveTerritoryStatus;
  onRequestPermission: () => void;
  onSync: () => void;
};

export function LiveTerritoryPanel({ stats, status, onRequestPermission, onSync }: LiveTerritoryPanelProps) {
  const syncing = status === "syncing" || status === "checkingPermission";
  const showPermissionPrompt = shouldShowLocationPermissionPrompt(status);
  const requestPermission = () => {
    if (Platform.OS === "web") {
      onRequestPermission();
      return;
    }
    Linking.openSettings().catch(onRequestPermission);
  };

  return (
    <View style={styles.livePanel}>
      {showPermissionPrompt ? (
        <View style={styles.locationPrompt}>
          <View style={styles.locationPromptTextWrap}>
            <Text style={styles.locationPromptTitle}>位置情報をONにしてください</Text>
            <Text style={styles.locationPromptBody}>ONにすると、移動した場所が領土になります</Text>
          </View>
          <TouchableOpacity onPress={requestPermission} style={styles.locationPromptButton}>
            <Text style={styles.locationPromptButtonText}>{Platform.OS === "web" ? "再確認" : "設定"}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.statsCard}>
        <Stat label="位置情報" value={getLiveTerritoryStatusLabel(status)} />
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
