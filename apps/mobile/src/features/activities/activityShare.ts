import { Share } from "react-native";
import type { TerritoryColor, TerritorySummary } from "@terri/shared";

export type TerritoryShareCardData = {
  title: string;
  createdAtLabel: string;
  distanceLabel: string;
  areaLabel: string;
  color: TerritoryColor;
};

export function buildTerritoryShareCardData(activity: TerritorySummary): TerritoryShareCardData {
  return {
    title: `${activity.createdAtLabel}のテリトリー`,
    createdAtLabel: activity.createdAtLabel,
    distanceLabel: `${activity.distanceKm.toFixed(1)} km`,
    areaLabel: `${activity.areaKm2.toFixed(2)} km²`,
    color: activity.color
  };
}

export function buildTerritoryShareMessage(activity: TerritorySummary) {
  return `TERRIで${activity.createdAtLabel}のテリトリーを確定: ${activity.distanceKm.toFixed(1)}km / ${activity.areaKm2.toFixed(2)}km²\n囲んだ場所が自分の色になった`;
}

export async function shareTerritorySummary(activity: TerritorySummary) {
  await Share.share({
    message: buildTerritoryShareMessage(activity)
  });
}
