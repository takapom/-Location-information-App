import { StyleSheet, Text, View } from "react-native";
import type { TerritoryShareCardData } from "@/features/activities/activityShare";
import { colors, font, shadow } from "@/theme/tokens";

type TerritoryShareCardProps = {
  data: TerritoryShareCardData;
};

export function TerritoryShareCard({ data }: TerritoryShareCardProps) {
  return (
    <View style={styles.card} testID="territory-share-card">
      <View style={styles.mapPreview}>
        <View style={[styles.territoryShape, { borderColor: data.color, backgroundColor: `${data.color}30` }]} />
        <View style={[styles.routeLine, { backgroundColor: data.color }]} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.subtitle}>囲んだ場所が自分の色になった</Text>
        <View style={styles.stats}>
          <Metric label="移動" value={data.distanceLabel} />
          <Metric label="面積" value={data.areaLabel} />
        </View>
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 188,
    borderRadius: 28,
    backgroundColor: colors.surface,
    overflow: "hidden",
    ...shadow
  },
  mapPreview: {
    height: 104,
    backgroundColor: colors.mapBase,
    alignItems: "center",
    justifyContent: "center"
  },
  territoryShape: {
    width: 118,
    height: 66,
    borderRadius: 18,
    borderWidth: 4,
    transform: [{ rotate: "-10deg" }]
  },
  routeLine: {
    position: "absolute",
    left: 54,
    right: 54,
    bottom: 20,
    height: 5,
    borderRadius: 3,
    opacity: 0.82
  },
  body: {
    padding: 16
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: font.heavy,
    color: colors.ink
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: font.bold,
    color: colors.muted
  },
  stats: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10
  },
  metric: {
    minWidth: 92,
    borderRadius: 16,
    backgroundColor: "#F5F3F1",
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  metricValue: {
    fontSize: 17,
    fontWeight: font.heavy,
    color: colors.ink
  },
  metricLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: font.bold,
    color: colors.muted
  }
});
