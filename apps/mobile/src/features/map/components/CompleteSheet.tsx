import { useState } from "react";
import { Text, View } from "react-native";
import type { LiveTerritoryResult } from "@terri/shared";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Pill } from "@/components/ui/Pill";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { shareTerritorySummary } from "@/features/activities/activityShare";
import { colors } from "@/theme/tokens";
import { styles } from "./HomeMapScreen.styles";

type CompleteSheetProps = {
  result: LiveTerritoryResult;
  onClose: () => void;
};

export function CompleteSheet({ result, onClose }: CompleteSheetProps) {
  const [shareError, setShareError] = useState<string | undefined>();
  const [sharing, setSharing] = useState(false);

  const shareResult = async () => {
    if (sharing) return;
    setSharing(true);
    setShareError(undefined);
    try {
      await shareTerritorySummary(result.territory);
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "シェアできませんでした");
    } finally {
      setSharing(false);
    }
  };

  return (
    <BottomSheet height="68%">
      <View style={styles.confetti}>
        {Array.from({ length: 28 }).map((_, index) => (
          <View key={index} style={[styles.confettiPiece, { left: `${(index * 13) % 94}%`, top: `${(index * 29) % 90}%`, backgroundColor: [colors.coral, colors.mint, colors.lavender, colors.sky, colors.yellow][index % 5] }]} />
        ))}
      </View>
      <View style={styles.shareMap}>
        <View style={styles.shareTerritory} />
      </View>
      <Text style={styles.completeArea}>+{result.territory.areaKm2.toFixed(2)} km²↑</Text>
      <View style={styles.completeStats}>
        <Pill>移動 {result.territory.distanceKm.toFixed(1)}km</Pill>
        <Pill tone="mint">時間 {result.territory.duration}</Pill>
        <Pill tone="lavender">面積 {result.territory.areaKm2.toFixed(2)}km²</Pill>
      </View>
      {shareError ? <Text style={styles.completeShareError} testID="complete-share-error">{shareError}</Text> : null}
      <PrimaryButton disabled={sharing} onPress={() => void shareResult()} testID="complete-share-button" variant="outline">{sharing ? "共有中" : "Instagramにシェア"}</PrimaryButton>
      <View style={{ height: 16 }} />
      <PrimaryButton onPress={onClose} testID="complete-close-button">閉じる</PrimaryButton>
    </BottomSheet>
  );
}
