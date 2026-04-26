import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SoftBackdrop } from "@/components/ui/Backdrop";
import { TerriLogo } from "@/components/ui/TerriLogo";
import { colors, font } from "@/theme/tokens";

export default function SplashScreen() {
  useEffect(() => {
    const timer = setTimeout(() => router.replace("/onboarding"), 850);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.screen}>
      <SoftBackdrop />
      <TerriLogo />
      <Text style={styles.copy}>歩いた分だけ、世界が自分のものになる</Text>
      <View style={styles.progress}>
        <View style={styles.bar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 28
  },
  copy: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: font.heavy,
    color: colors.muted
  },
  progress: {
    position: "absolute",
    bottom: 82,
    width: "70%",
    height: 22,
    borderWidth: 3,
    borderColor: colors.coral,
    borderRadius: 13,
    padding: 3
  },
  bar: {
    width: "62%",
    height: "100%",
    borderRadius: 10,
    backgroundColor: colors.coral
  }
});
