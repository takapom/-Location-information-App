import { Text, View } from "react-native";
import type { CompleteActivityResult } from "@/lib/repositories/terriRepository";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Pill } from "@/components/ui/Pill";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { colors } from "@/theme/tokens";
import { styles } from "./HomeMapScreen.styles";

type CompleteSheetProps = {
  result: CompleteActivityResult;
  onClose: () => void;
};

export function CompleteSheet({ result, onClose }: CompleteSheetProps) {
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
      <PrimaryButton variant="outline">Instagramにシェア</PrimaryButton>
      <View style={{ height: 16 }} />
      <PrimaryButton onPress={onClose}>閉じる</PrimaryButton>
    </BottomSheet>
  );
}
