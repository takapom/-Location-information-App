import { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import type { TerritoryColor, UserProfile } from "@terri/shared";
import { useAuth } from "@/features/auth/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/Pill";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SoftBackdrop } from "@/components/ui/Backdrop";
import { useTerriRepository } from "@/lib/repositories/RepositoryProvider";
import { colors, font, territoryColors } from "@/theme/tokens";

export function ProfileScreen() {
  const repository = useTerriRepository();
  const auth = useAuth();
  const params = useLocalSearchParams<{ setup?: string }>();
  const isInitialSetup = params.setup === "1";
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (auth.enabled && auth.loading) return;
    if (auth.enabled && !auth.session) {
      router.replace("/login");
      return;
    }

    let active = true;
    repository
      .getProfile()
      .then((nextProfile) => {
        if (!active) return;
        setProfile(nextProfile);
        setError(undefined);
      })
      .catch((nextError: unknown) => {
        if (!active) return;
        setError(nextError instanceof Error ? nextError.message : "プロフィールを読み込めませんでした");
      });

    return () => {
      active = false;
    };
  }, [auth.enabled, auth.loading, auth.session, repository]);

  const updateColor = async (color: TerritoryColor) => {
    setProfile(await repository.updateTerritoryColor(color));
  };

  const updateSetting = async (input: Parameters<typeof repository.updateProfile>[0]) => {
    setProfile(await repository.updateProfile(input));
  };

  const signOut = async () => {
    await auth.signOut();
    router.replace("/login");
  };

  const close = () => {
    if (isInitialSetup) {
      router.replace("/map");
      return;
    }
    router.back();
  };

  if (!profile) {
    return (
      <View style={styles.screen}>
        <Text style={styles.loading}>{error ?? "読み込み中"}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SoftBackdrop />
      <TouchableOpacity onPress={close} style={styles.close}>
        <Text style={[styles.closeText, isInitialSetup && styles.doneText]}>{isInitialSetup ? "完了" : "×"}</Text>
      </TouchableOpacity>
      <View style={styles.header}>
        <Avatar initials={profile.initials} color={profile.territoryColor} size={122} active />
        <Text style={styles.name}>{profile.name} ✎</Text>
        <Pill>🚶 {profile.emojiStatus}</Pill>
      </View>
      <View style={styles.statsRow}>
        <View style={[styles.bigStat, { backgroundColor: colors.coral }]}>
          <Text style={styles.bigStatLabel}>🗺 総面積</Text>
          <Text style={styles.bigStatValue}>{profile.totalAreaKm2.toFixed(1)} km²</Text>
        </View>
        <View style={[styles.bigStat, { backgroundColor: colors.mint }]}>
          <Text style={styles.bigStatLabel}>🚶 総距離</Text>
          <Text style={styles.bigStatValue}>{profile.totalDistanceKm} km</Text>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <Setting label="🔔 通知" value={profile.notificationsEnabled} onChange={(value) => updateSetting({ notificationsEnabled: value })} />
        <Setting label="📍 バックグラウンド" value={profile.backgroundTrackingEnabled} onChange={(value) => updateSetting({ backgroundTrackingEnabled: value })} />
        <Setting label="テリトリー生成" value={profile.territoryCaptureEnabled} onChange={(value) => updateSetting({ territoryCaptureEnabled: value })} />
        <Setting label="現在地共有" value={profile.locationSharingEnabled} onChange={(value) => updateSetting({ locationSharingEnabled: value })} />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎨 陣地の色</Text>
        <View style={styles.swatches}>
          {territoryColors.map((color) => (
            <TouchableOpacity key={color} onPress={() => updateColor(color)} style={[styles.swatch, { backgroundColor: color }, profile.territoryColor === color && styles.selectedSwatch]}>
              {profile.territoryColor === color ? <Text style={styles.check}>✓</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {isInitialSetup ? (
        <PrimaryButton onPress={() => router.replace("/map")} variant="dark">
          この設定ではじめる
        </PrimaryButton>
      ) : null}
      <PrimaryButton onPress={signOut} variant="line">ログアウト</PrimaryButton>
    </View>
  );
}

function Setting({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.switchWrap}>
        <Text style={styles.onText}>{value ? "ON" : "OFF"}</Text>
        <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.coral, false: "#D3D0D2" }} thumbColor="#FFFFFF" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: 28,
    paddingTop: 82,
    paddingBottom: 36
  },
  loading: {
    marginTop: 80,
    textAlign: "center",
    fontSize: 26,
    fontWeight: font.heavy
  },
  close: {
    position: "absolute",
    right: 26,
    top: 72,
    zIndex: 2
  },
  closeText: {
    fontSize: 48,
    color: colors.coral
  },
  doneText: {
    fontSize: 18,
    fontWeight: font.heavy
  },
  header: {
    alignItems: "center"
  },
  name: {
    marginTop: 26,
    fontSize: 42,
    fontWeight: font.heavy,
    color: colors.ink
  },
  statsRow: {
    marginTop: 34,
    flexDirection: "row",
    gap: 14
  },
  bigStat: {
    flex: 1,
    height: 90,
    borderRadius: 28,
    justifyContent: "center",
    paddingHorizontal: 18
  },
  bigStatLabel: {
    fontSize: 19,
    fontWeight: font.heavy,
    color: colors.surface
  },
  bigStatValue: {
    marginTop: 4,
    fontSize: 26,
    fontWeight: font.heavy,
    color: colors.surface
  },
  section: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 24
  },
  sectionTitle: {
    fontSize: 27,
    fontWeight: font.heavy,
    color: colors.ink
  },
  settingRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  settingLabel: {
    fontSize: 24,
    fontWeight: font.heavy,
    color: colors.ink
  },
  switchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  onText: {
    fontSize: 18,
    color: colors.muted,
    fontWeight: font.heavy
  },
  swatches: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  swatch: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center"
  },
  selectedSwatch: {
    borderWidth: 5,
    borderColor: colors.surface
  },
  check: {
    color: colors.surface,
    fontSize: 34,
    fontWeight: font.heavy
  }
});
