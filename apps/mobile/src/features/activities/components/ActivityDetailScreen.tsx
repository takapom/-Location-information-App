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

export function ActivityDetailScreen() {
  const repository = useTerriRepository();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activity, setActivity] = useState<TerritorySummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    repository
      .getActivity(id)
      .then((nextActivity) => {
        if (active) setActivity(nextActivity);
      })
      .catch((nextError: unknown) => {
        if (active) setError(nextError instanceof Error ? nextError.message : "履歴を読み込めませんでした");
      });

    return () => {
      active = false;
    };
  }, [id, repository]);

  return (
    <View style={styles.screen}>
      <MapSurface friends={[]} showRoute />
      <TouchableOpacity style={[styles.roundButton, styles.back]} onPress={() => router.back()}>
        <Text style={styles.icon}>←</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.roundButton, styles.share]}>
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
            <PrimaryButton>📷 シェアする</PrimaryButton>
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
  }
});
