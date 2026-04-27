import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/features/auth/AuthProvider";
import { SoftBackdrop } from "@/components/ui/Backdrop";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { TerriLogo } from "@/components/ui/TerriLogo";
import { colors, font } from "@/theme/tokens";

export default function LoginScreen() {
  const auth = useAuth();
  const [email, setEmail] = useState("dev@terri.local");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | undefined>();

  const submit = async (mode: "signin" | "signup") => {
    if (!auth.enabled) {
      router.replace("/map");
      return;
    }

    try {
      setError(undefined);
      if (mode === "signin") {
        await auth.signInWithPassword({ email, password });
      } else {
        await auth.signUpWithPassword({ email, password });
      }
      router.replace("/map");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "ログインできませんでした");
    }
  };

  return (
    <View style={styles.screen}>
      <SoftBackdrop />
      <View style={styles.logo}>
        <TerriLogo compact />
        <Text style={styles.copy}>歩いた分だけ、世界が自分のものになる</Text>
      </View>
      <View style={styles.buttons}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="email"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="password"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        {error || auth.errorMessage ? <Text style={styles.error}>{error ?? auth.errorMessage}</Text> : null}
        <PrimaryButton onPress={() => submit("signin")} variant="dark">
          {auth.loading ? "接続中" : "ログイン"}
        </PrimaryButton>
        <PrimaryButton onPress={() => submit("signup")} variant="outline">
          アカウント作成
        </PrimaryButton>
      </View>
      <View style={styles.orRow}>
        <View style={styles.line} />
        <Text style={styles.or}>または</Text>
        <View style={styles.line} />
      </View>
      <TouchableOpacity onPress={() => submit("signin")}>
        <Text style={styles.link}>メールアドレスで続ける</Text>
      </TouchableOpacity>
      {!auth.enabled ? (
        <TouchableOpacity onPress={() => router.replace("/map")} style={styles.create}>
          <Text style={styles.createText}>モックで始める</Text>
        </TouchableOpacity>
      ) : null}
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
  input: {
    height: 62,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    fontSize: 20,
    fontWeight: font.heavy,
    color: colors.ink
  },
  error: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: font.heavy,
    color: colors.coral
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
