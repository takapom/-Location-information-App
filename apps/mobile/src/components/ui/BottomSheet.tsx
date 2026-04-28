import { StyleSheet, View } from "react-native";
import type { PropsWithChildren } from "react";
import { colors, shadow } from "@/theme/tokens";

export function BottomSheet({ children, height = "58%" }: PropsWithChildren<{ height?: `${number}%` }>) {
  return (
    <View style={[styles.sheet, { height }]}>
      <View style={styles.handle} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1800,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 28,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    backgroundColor: colors.surface,
    ...shadow,
    elevation: 18
  },
  handle: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    width: 54,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C9C5C8"
  }
});
