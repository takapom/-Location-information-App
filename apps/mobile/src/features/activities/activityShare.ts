import { Share } from "react-native";
import type { TerritorySummary } from "@terri/shared";

export function buildTerritoryShareMessage(activity: TerritorySummary) {
  return `TERRIで${activity.createdAtLabel}のテリトリーを広げました: ${activity.distanceKm.toFixed(1)}km / ${activity.areaKm2.toFixed(2)}km2`;
}

export async function shareTerritorySummary(activity: TerritorySummary) {
  await Share.share({
    message: buildTerritoryShareMessage(activity)
  });
}
