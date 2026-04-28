import type { LatLngTuple } from "./mapGeometry";

type AutoCenterInput = {
  hasUserMovedMap: boolean;
  previousCenterKey?: string;
  nextCenterKey: string;
};

export function toLatLngKey(center: LatLngTuple) {
  return `${center[0].toFixed(6)}:${center[1].toFixed(6)}`;
}

export function shouldAutoCenterMap({ hasUserMovedMap, previousCenterKey, nextCenterKey }: AutoCenterInput) {
  if (hasUserMovedMap) return false;
  return previousCenterKey !== nextCenterKey;
}
