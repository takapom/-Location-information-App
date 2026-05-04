import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import type { TerritorySummary } from "@terri/shared";
import { MapSurface } from "@/components/map/MapSurface";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useTerriRepository } from "@/lib/repositories/RepositoryProvider";
import { colors, font, shadow } from "@/theme/tokens";
import { formatAverageSpeed } from "../activityMetrics";
import { shareTerritorySummary } from "../activityShare";

export function ActivityDetailScreen() {
  const repository = useTerriRepository();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activity, setActivity] = useState<TerritorySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let active = true;

    repository
      .getActivity(id)
      .then((nextActivity) => {
        if (!active) return;
        setActivity(nextActivity);
        setError(null);
      })
      .catch((nextError: unknown) => {
        if (active) setError(nextError instanceof Error ? nextError.message : "履歴を読み込めませんでした");
      });

    return () => {
      active = false;
    };
  }, [id, repository]);

  const shareActivity = async () => {
    if (!activity || error || sharing) return;
    setSharing(true);
    setShareError(null);
    try {
      await shareTerritorySummary(activity);
    } catch (nextError) {
      setShareError(nextError instanceof Error ? nextError.message : "シェアできませんでした");
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.screen}>
      <MapSurface friends={[]} showRoute />
      <TouchableOpacity accessibilityLabel="活動詳細から戻る" accessibilityRole="button" style={[styles.roundButton, styles.back]} onPress={() => router.back()} testID="activity-back-button">
        <Text style={styles.icon}>←</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityLabel="活動をシェア"
        accessibilityRole="button"
        disabled={!activity || Boolean(error) || sharing}
        onPress={() => void shareActivity()}
        style={[styles.roundButton, styles.share, (!activity || Boolean(error) || sharing) && styles.disabledButton]}
        testID="activity-share-icon-button"
      >
        <Text style={styles.icon}>⇧</Text>
      </TouchableOpacity>
      <BottomSheet height="42%">
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <>
            <Text style={styles.date}>{activity?.createdAtLabel ?? "読み込み中"}</Text>
            <View style={styles.grid}>
              <Metric icon="🏃" value={`${(activity?.distanceKm ?? 0).toFixed(1)} km`} />
              <Metric icon="◷" value={activity?.duration ?? "--:--"} />
              <Metric icon="⬚" value={`${(activity?.areaKm2 ?? 0).toFixed(2)} km²`} />
              <Metric icon="ϟ" value={activity ? formatAverageSpeed(activity.distanceKm, activity.duration) : "-- km/h"} />
            </View>
            {shareError ? <Text style={styles.shareError} testID="activity-share-error">{shareError}</Text> : null}
            <PrimaryButton disabled={!activity || sharing} onPress={() => void shareActivity()} testID="activity-share-button">{sharing ? "共有中" : "📷 シェアする"}</PrimaryButton>
          </>
        )}
      </BottomSheet>
    </View>
  );
}

function Metric({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricIcon}>{icon}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.mapBase
  },
  roundButton: {
    position: "absolute",
    top: 72,
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow
  },
  back: {
    left: 24
  },
  share: {
    right: 24
  },
  disabledButton: {
    opacity: 0.48
  },
  icon: {
    fontSize: 38,
    fontWeight: font.heavy,
    color: colors.ink
  },
  date: {
    marginTop: 34,
    fontSize: 34,
    fontWeight: font.heavy,
    color: colors.ink,
    letterSpacing: 4
  },
  grid: {
    marginTop: 26,
    marginBottom: 28,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14
  },
  metric: {
    width: "47%",
    height: 82,
    borderRadius: 18,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    ...shadow
  },
  metricIcon: {
    fontSize: 30,
    color: colors.muted
  },
  metricValue: {
    fontSize: 25,
    fontWeight: font.heavy,
    color: colors.ink
  },
  error: {
    marginTop: 72,
    textAlign: "center",
    fontSize: 24,
    fontWeight: font.heavy,
    color: colors.coral
  },
  shareError: {
    marginBottom: 14,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: font.heavy,
    color: colors.coral
  }
});
