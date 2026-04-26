import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "./HomeMapScreen.styles";

type TrackingStats = {
  elapsed: string;
  distanceKm: number;
  previewAreaKm2: number;
};

type TrackingControlsProps = {
  stats: TrackingStats;
  stopping: boolean;
  onStop: () => void;
};

export function TrackingControls({ stats, stopping, onStop }: TrackingControlsProps) {
  return (
    <View style={styles.trackingWrap}>
      <View style={styles.statsCard}>
        <Stat label="時間" value={stats.elapsed} icon="⏱" />
        <Divider />
        <Stat label="距離" value={`${stats.distanceKm.toFixed(1)} km`} icon="👣" />
        <Divider />
        <Stat label="見込み" value={`${stats.previewAreaKm2.toFixed(2)} km²`} icon="⬚" />
      </View>
      <View style={styles.stopRow}>
        <TouchableOpacity style={styles.pauseButton}>
          <Text style={styles.pauseText}>Ⅱ</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={stopping} onPress={onStop} style={[styles.stopButton, stopping && { opacity: 0.7 }]}>
          <Text style={styles.stopText}>{stopping ? "保存中" : "STOP"}</Text>
        </TouchableOpacity>
      </View>
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
