import { StyleSheet, Text, View } from "react-native";
import { colors, font, shadow } from "@/theme/tokens";

export function TerriLogo({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.mark, compact && styles.compactMark]}>
        <View style={styles.markInner} />
        <View style={styles.markCut} />
      </View>
      <Text style={[styles.word, compact && styles.compactWord]}>TERRI</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center"
  },
  mark: {
    width: 110,
    height: 140,
    borderRadius: 28,
    borderWidth: 8,
    borderColor: "#050505",
    backgroundColor: colors.coral,
    transform: [{ rotate: "-18deg" }],
    ...shadow
  },
  compactMark: {
    width: 70,
    height: 88,
    borderRadius: 20,
    borderWidth: 6
  },
  markInner: {
    position: "absolute",
    right: 18,
    top: 18,
    width: 28,
    height: 8,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "25deg" }]
  },
  markCut: {
    position: "absolute",
    right: -13,
    top: 54,
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderLeftWidth: 8,
    borderBottomWidth: 8,
    borderColor: "#050505"
  },
  word: {
    marginTop: 30,
    fontSize: 64,
    lineHeight: 70,
    fontWeight: font.heavy,
    letterSpacing: 0,
    color: colors.ink
  },
  compactWord: {
    marginTop: 18,
    fontSize: 44,
    lineHeight: 50
  }
});
