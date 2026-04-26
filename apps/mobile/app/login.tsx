import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { SoftBackdrop } from "@/components/ui/Backdrop";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { TerriLogo } from "@/components/ui/TerriLogo";
import { colors, font } from "@/theme/tokens";

export default function LoginScreen() {
  return (
    <View style={styles.screen}>
      <SoftBackdrop />
      <View style={styles.logo}>
        <TerriLogo compact />
        <Text style={styles.copy}>歩いた分だけ、世界が自分のものになる</Text>
      </View>
      <View style={styles.buttons}>
        <PrimaryButton onPress={() => router.replace("/map")} variant="outline">
          G  Googleで続ける
        </PrimaryButton>
        <PrimaryButton onPress={() => router.replace("/map")} variant="dark">
          Appleで続ける
        </PrimaryButton>
        <PrimaryButton onPress={() => router.replace("/map")}>LINEで続ける</PrimaryButton>
      </View>
      <View style={styles.orRow}>
        <View style={styles.line} />
        <Text style={styles.or}>または</Text>
        <View style={styles.line} />
      </View>
      <TouchableOpacity onPress={() => router.replace("/map")}>
        <Text style={styles.link}>メールアドレスでログイン⌄</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.replace("/map")} style={styles.create}>
        <Text style={styles.createText}>アカウントを作成</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: 28,
    paddingTop: 100,
    paddingBottom: 52
  },
  logo: {
    alignItems: "center"
  },
  copy: {
    marginTop: 18,
    fontSize: 17,
    color: colors.ink,
    fontWeight: font.heavy
  },
  buttons: {
    marginTop: 80,
    gap: 20
  },
  orRow: {
    marginTop: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 18
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#DAD7D5"
  },
  or: {
    fontSize: 18,
    color: colors.muted,
    fontWeight: font.heavy
  },
  link: {
    marginTop: 30,
    textAlign: "center",
    fontSize: 21,
    color: colors.muted,
    fontWeight: font.heavy,
    textDecorationLine: "underline"
  },
  create: {
    marginTop: "auto"
  },
  createText: {
    textAlign: "center",
    fontSize: 22,
    color: colors.coral,
    fontWeight: font.heavy,
    textDecorationLine: "underline"
  }
});
