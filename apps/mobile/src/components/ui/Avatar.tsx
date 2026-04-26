import { StyleSheet, Text, View } from "react-native";
import type { TerritoryColor } from "@terri/shared";
import { colors, font, shadow } from "@/theme/tokens";

export function Avatar({ initials, color = colors.coral, size = 64, active = false }: { initials: string; color?: TerritoryColor; size?: number; active?: boolean }) {
  return (
    <View style={[styles.outer, { width: size, height: size, borderRadius: size / 2, borderColor: color }]}>
      <View style={[styles.inner, { borderRadius: size / 2 }]}>
        <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initials}</Text>
      </View>
      {active ? <View style={[styles.dot, { right: size * -0.02, bottom: size * 0.08 }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderWidth: 6,
    backgroundColor: colors.surface,
    padding: 4,
    ...shadow
  },
  inner: {
    flex: 1,
    backgroundColor: "#F1F0ED",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  text: {
    fontWeight: font.heavy,
    color: colors.ink
  },
  dot: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: colors.surface,
    backgroundColor: "#30D36F"
  }
});
