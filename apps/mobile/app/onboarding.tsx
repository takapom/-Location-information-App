import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { SoftBackdrop } from "@/components/ui/Backdrop";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { colors, font, shadow } from "@/theme/tokens";

export default function OnboardingScreen() {
  return (
    <View style={styles.screen}>
      <SoftBackdrop />
      <TouchableOpacity onPress={() => router.replace("/login")} style={styles.skip}>
        <Text style={styles.skipText}>スキップ</Text>
      </TouchableOpacity>
      <View style={styles.illustration}>
        <View style={styles.city}>
          {Array.from({ length: 12 }).map((_, index) => (
            <View key={index} style={[styles.building, { height: 42 + (index % 4) * 22, backgroundColor: index % 2 ? "#E8F2F1" : "#FFE0D8" }]} />
          ))}
        </View>
        <View style={styles.route} />
        <View style={styles.walker}>
          <Text style={styles.walkerText}>🚶</Text>
        </View>
      </View>
      <Text style={styles.title}>ぐるっと囲んで{"\n"}テリトリーを作ろう!</Text>
      <Text style={styles.subtitle}>線を引いて、囲めた場所が自分の色になる</Text>
      <View style={styles.steps}>
        {["歩くと線が伸びる", "戻って囲む", "内側がテリトリーになる"].map((step, index) => (
          <View key={step} style={styles.stepPill}>
            <Text style={styles.stepNumber}>{index + 1}</Text>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
      <View style={styles.dots}>
        <View style={styles.dot} />
        <View style={styles.activeDot} />
        <View style={styles.dot} />
      </View>
      <PrimaryButton onPress={() => router.replace("/login")}>→</PrimaryButton>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: 28,
    paddingTop: 74,
    paddingBottom: 48
  },
  skip: {
    alignSelf: "flex-end"
  },
  skipText: {
    fontSize: 22,
    color: colors.muted,
    fontWeight: font.heavy
  },
  illustration: {
    height: 330,
    marginTop: 30,
    borderRadius: 36,
    backgroundColor: "#FFF3DF",
    overflow: "hidden",
    justifyContent: "center",
    ...shadow
  },
  city: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingHorizontal: 22
  },
  building: {
    width: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#6F625B"
  },
  route: {
    position: "absolute",
    left: 54,
    right: 54,
    top: 128,
    height: 110,
    borderWidth: 8,
    borderColor: colors.coral,
    borderRadius: 22,
    transform: [{ rotate: "-9deg" }]
  },
  walker: {
    position: "absolute",
    right: 62,
    top: 100,
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  walkerText: {
    fontSize: 48
  },
  title: {
    marginTop: 50,
    fontSize: 45,
    lineHeight: 58,
    fontWeight: font.heavy,
    color: colors.ink,
    letterSpacing: 0
  },
  subtitle: {
    marginTop: 22,
    fontSize: 19,
    color: colors.muted,
    fontWeight: font.heavy
  },
  steps: {
    marginTop: 20,
    gap: 8
  },
  stepPill: {
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    ...shadow
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.mint,
    color: colors.ink,
    textAlign: "center",
    lineHeight: 24,
    fontSize: 14,
    fontWeight: font.heavy
  },
  stepText: {
    marginLeft: 10,
    fontSize: 15,
    lineHeight: 20,
    color: colors.ink,
    fontWeight: font.heavy
  },
  dots: {
    marginVertical: 24,
    flexDirection: "row",
    justifyContent: "center",
    gap: 12
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#D8D8D8"
  },
  activeDot: {
    width: 42,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.coral
  }
});
