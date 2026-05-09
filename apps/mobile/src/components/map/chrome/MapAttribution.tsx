import { memo } from "react";
import { StyleSheet, Text } from "react-native";
import { colors, font } from "@/theme/tokens";

type MapAttributionProps = {
  attribution: string;
};

export const MapAttribution = memo(function MapAttribution({ attribution }: MapAttributionProps) {
  return (
    <Text pointerEvents="none" style={styles.text} testID="map-attribution">
      {attribution}
    </Text>
  );
});

const styles = StyleSheet.create({
  text: {
    position: "absolute",
    left: 12,
    bottom: 88,
    maxWidth: "64%",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.82)",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: font.bold,
    letterSpacing: 0,
    color: colors.ink
  }
});
