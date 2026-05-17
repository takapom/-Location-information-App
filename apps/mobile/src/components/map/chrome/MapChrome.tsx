import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { MapPrivacyLabel } from "@/components/map/scene/mapSceneTypes";
import { colors, font, shadow } from "@/theme/tokens";
import { MapAttribution } from "./MapAttribution";

type MapChromeProps = {
  placeLabel: string;
  activeFriendCount: number;
  privacyLabel: MapPrivacyLabel;
  attribution: string;
};

export const MapChrome = memo(function MapChrome({ placeLabel, activeFriendCount, privacyLabel, attribution }: MapChromeProps) {
  return (
    <>
      <Text pointerEvents="none" style={styles.place} testID="map-place-label">
        {placeLabel}
      </Text>
      <View pointerEvents="none" style={styles.activePill} testID="map-active-friends-pill">
        <Text style={styles.activeText}>{`${activeFriendCount} 人が今アクティブ 🔥`}</Text>
      </View>
      <View pointerEvents="none" style={styles.privacyPill} testID="map-privacy-pill">
        <Text style={styles.privacyText}>{privacyLabel}</Text>
      </View>
      <MapAttribution attribution={attribution} />
    </>
  );
});

const styles = StyleSheet.create({
  place: {
    position: "absolute",
    left: 24,
    top: 86,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: font.heavy,
    letterSpacing: 0,
    color: colors.ink
  },
  activePill: {
    position: "absolute",
    top: 156,
    alignSelf: "center",
    minWidth: 168,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: "#FFD5DF",
    alignItems: "center",
    justifyContent: "center",
    ...shadow
  },
  activeText: {
    fontSize: 14,
    fontWeight: font.heavy,
    letterSpacing: 0,
    color: colors.ink
  },
  privacyPill: {
    position: "absolute",
    right: 18,
    top: 150,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    ...shadow
  },
  privacyText: {
    fontSize: 12,
    fontWeight: font.heavy,
    letterSpacing: 0,
    color: colors.ink
  }
});
