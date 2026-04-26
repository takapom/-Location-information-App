import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "./HomeMapScreen.styles";

type StartDockProps = {
  onHistory: () => void;
  onStart: () => void;
  onRanking: () => void;
};

export function StartDock({ onHistory, onStart, onRanking }: StartDockProps) {
  return (
    <View style={styles.startDock}>
      <TouchableOpacity onPress={onHistory} style={styles.dockSide}>
        <Text style={styles.dockIcon}>◷</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onStart} style={styles.startButton} testID="start-tracking-button">
        <Text style={styles.startText}>START</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onRanking} style={styles.dockSide}>
        <Text style={styles.dockIcon}>🏆</Text>
      </TouchableOpacity>
    </View>
  );
}
