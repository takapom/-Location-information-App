import { Pressable, StyleSheet, Text } from "react-native";
import type { PropsWithChildren } from "react";
import { colors, font, shadow } from "@/theme/tokens";

export function PrimaryButton({ children, onPress, variant = "filled" }: PropsWithChildren<{ onPress?: () => void; variant?: "filled" | "outline" | "dark" | "line" }>) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, styles[variant], pressed && styles.pressed]}>
      <Text style={[styles.text, variant === "outline" || variant === "line" ? styles.outlineText : styles.filledText]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 68,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    ...shadow
  },
  filled: {
    backgroundColor: colors.coral
  },
  dark: {
    backgroundColor: colors.ink
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.coral
  },
  line: {
    height: 54,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.coral,
    shadowOpacity: 0,
    elevation: 0
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9
  },
  text: {
    fontSize: 22,
    fontWeight: font.heavy,
    letterSpacing: 0
  },
  filledText: {
    color: colors.surface
  },
  outlineText: {
    color: colors.coral
  }
});
