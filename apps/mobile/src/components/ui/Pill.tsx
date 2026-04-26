import { StyleSheet, Text, View } from "react-native";
import type { PropsWithChildren } from "react";
import { colors, font, shadow } from "@/theme/tokens";

export function Pill({ children, tone = "coral" }: PropsWithChildren<{ tone?: "coral" | "mint" | "lavender" | "neutral" }>) {
  return (
    <View style={[styles.pill, styles[tone]]}>
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    ...shadow
  },
  coral: {
    backgroundColor: "#FFD5CF"
  },
  mint: {
    backgroundColor: "#CFF4E8"
  },
  lavender: {
    backgroundColor: "#E7DBFF"
  },
  neutral: {
    backgroundColor: "#F0EEF0"
  },
  text: {
    fontSize: 16,
    fontWeight: font.heavy,
    color: colors.ink
  }
});
