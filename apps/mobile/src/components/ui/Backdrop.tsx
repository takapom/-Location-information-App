import { StyleSheet, View } from "react-native";
import { colors } from "@/theme/tokens";

export function SoftBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.blob, styles.coral]} />
      <View style={[styles.blob, styles.mint]} />
      <View style={[styles.blob, styles.lavender]} />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    opacity: 0.45
  },
  coral: {
    left: -80,
    top: 24,
    backgroundColor: colors.coral
  },
  mint: {
    right: -90,
    top: 330,
    backgroundColor: colors.mint
  },
  lavender: {
    left: -110,
    bottom: 20,
    backgroundColor: colors.lavender
  }
});
