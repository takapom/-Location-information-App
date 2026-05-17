import { Linking, Platform, Text, TouchableOpacity, View } from "react-native";
import type { LiveTerritoryStats } from "@terri/shared";
import type { LiveTerritoryStatus } from "@/features/tracking/services/liveTerritoryState";
import { canSyncLiveTerritoryStatus, getFinalizeButtonLabel, getLiveTerritoryStatusLabel, getLoopCaptureGuidance, shouldShowLocationPermissionPrompt } from "@/features/tracking/services/liveTerritoryState";
import { styles } from "./HomeMapScreen.styles";

type LiveTerritoryPanelProps = {
  stats: LiveTerritoryStats;
  status: LiveTerritoryStatus;
  onRequestPermission: () => void;
  onSync: () => void;
  onFinalize: () => void;
  routePointCount?: number;
};

export function LiveTerritoryPanel({ stats, status, onRequestPermission, onSync, onFinalize, routePointCount = 0 }: LiveTerritoryPanelProps) {
  const syncing = status === "syncing";
  const canSync = canSyncLiveTerritoryStatus(status);
  const canFinalize = status === "live" || status === "syncing";
  const showPermissionPrompt = shouldShowLocationPermissionPrompt(status);
  const guidance = getLoopCaptureGuidance({
    status,
    routePointCount,
    previewAreaKm2: stats.previewAreaKm2
  });
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
          <TouchableOpacity accessibilityRole="button" onPress={requestPermission} style={styles.locationPromptButton} testID="location-settings-button">
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
        <TouchableOpacity accessibilityRole="button" disabled={!canSync} onPress={onSync} style={[styles.syncButton, !canSync && { opacity: 0.7 }]} testID="sync-territory-button">
          <Text style={styles.syncText}>{syncing ? "同期中" : "同期"}</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.loopGuidance, styles[`loopGuidance_${guidance.tone}`]]} testID="loop-capture-guidance">
        <Text style={styles.loopGuidanceTitle}>{guidance.title}</Text>
        <Text style={styles.loopGuidanceBody}>{guidance.body}</Text>
      </View>
      {canFinalize || status === "finalizing" ? (
        <View style={styles.stopRow}>
          <TouchableOpacity accessibilityRole="button" disabled={!canFinalize} onPress={onFinalize} style={[styles.stopButton, !canFinalize && { opacity: 0.72 }]} testID="finalize-territory-button">
            <Text style={styles.stopText}>{getFinalizeButtonLabel(status)}</Text>
            <Text style={styles.stopSubText}>今日の線と囲めたテリトリーを結果カードにします</Text>
          </TouchableOpacity>
        </View>
      ) : null}
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
