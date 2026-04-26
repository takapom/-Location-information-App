import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "./HomeMapScreen.styles";

type StartDockProps = {
  onHistory: () => void;
  onLivePress: () => void;
  onRanking: () => void;
  liveLabel: string;
};

export function StartDock({ onHistory, onLivePress, onRanking, liveLabel }: StartDockProps) {
  return (
    <View style={styles.startDock}>
      <TouchableOpacity onPress={onHistory} style={styles.dockSide}>
        <Text style={styles.dockIcon}>◷</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onLivePress} style={styles.startButton} testID="live-territory-button">
        <Text style={styles.startText}>{liveLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onRanking} style={styles.dockSide}>
        <Text style={styles.dockIcon}>🏆</Text>
      </TouchableOpacity>
    </View>
  );
}
