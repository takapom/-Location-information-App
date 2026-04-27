import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/features/auth/AuthProvider";
import { getPostAuthRoute, validateAuthCredentials, type AuthFormMode } from "@/features/auth/authForm";
import { SoftBackdrop } from "@/components/ui/Backdrop";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { TerriLogo } from "@/components/ui/TerriLogo";
import { colors, font } from "@/theme/tokens";

export default function LoginScreen() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const canSubmit = Boolean(email.trim() && password) && !auth.loading;

  const submit = async (mode: AuthFormMode) => {
    if (!auth.enabled) {
      router.replace("/map");
      return;
    }

    const validation = validateAuthCredentials({ email, password });
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    try {
      setError(undefined);
      if (mode === "signin") {
        await auth.signInWithPassword(validation.credentials);
      } else {
        await auth.signUpWithPassword(validation.credentials);
      }
      router.replace(getPostAuthRoute(mode));
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
          onChangeText={(value) => {
            setEmail(value);
            setError(undefined);
          }}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="メールアドレス"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setError(undefined);
          }}
          autoComplete="password"
          secureTextEntry
          textContentType="password"
          placeholder="パスワード"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        {error || auth.errorMessage ? <Text style={styles.error}>{error ?? auth.errorMessage}</Text> : null}
        <PrimaryButton disabled={!canSubmit} onPress={() => submit("signin")} variant="dark">
          {auth.loading ? "接続中" : "ログイン"}
        </PrimaryButton>
        <PrimaryButton disabled={!canSubmit} onPress={() => submit("signup")} variant="outline">
          アカウント作成
        </PrimaryButton>
      </View>
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
