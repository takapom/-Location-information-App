import type { GeoPoint, TerritoryGeometry } from "@terri/shared";
import { getDistanceMeters } from "./trackingPolicy";

export type LoopTerritoryPoint = GeoPoint & {
  recordedAt?: string;
};

export type LoopTerritoryPreview = {
  route: GeoPoint[];
  loops: Array<{
    id: string;
    startIndex: number;
    endIndex: number;
    areaM2: number;
    distanceM: number;
  }>;
  geometry?: TerritoryGeometry;
  areaM2: number;
};

export type LoopTerritoryOptions = {
  closeDistanceM?: number;
  minLoopPointCount?: number;
  minLoopDistanceM?: number;
  minLoopAreaM2?: number;
};

const earthRadiusM = 6_371_000;
const defaultCloseDistanceM = 500;
const defaultMinLoopPointCount = 4;
const defaultMinLoopDistanceM = 100;
const defaultMinLoopAreaM2 = 100;
const closeDistanceHysteresisM = 25;

export function buildLoopTerritoryPreview(points: LoopTerritoryPoint[], options: LoopTerritoryOptions = {}): LoopTerritoryPreview {
  const route = points.map(toGeoPoint);
  const closeDistanceM = options.closeDistanceM ?? defaultCloseDistanceM;
  const minLoopPointCount = options.minLoopPointCount ?? defaultMinLoopPointCount;
  const minLoopDistanceM = options.minLoopDistanceM ?? defaultMinLoopDistanceM;
  const minLoopAreaM2 = options.minLoopAreaM2 ?? defaultMinLoopAreaM2;
  const loops: LoopTerritoryPreview["loops"] = [];
  const polygons: number[][][][] = [];
  let areaM2 = 0;
  let searchStartIndex = 0;

  while (searchStartIndex <= route.length - minLoopPointCount) {
    const candidate = findNextLoopCandidate({
      route,
      searchStartIndex,
      closeDistanceM,
      minLoopPointCount,
      minLoopDistanceM,
      minLoopAreaM2
    });
    if (!candidate) break;

    loops.push({
      id: `loop-${candidate.startIndex}-${candidate.endIndex}`,
      startIndex: candidate.startIndex,
      endIndex: candidate.endIndex,
      areaM2: candidate.areaM2,
      distanceM: candidate.distanceM
    });
    areaM2 += candidate.areaM2;
    polygons.push([candidate.ring.map((point) => [point.longitude, point.latitude])]);
    searchStartIndex = candidate.endIndex;
  }

  return {
    route,
    loops,
    geometry:
      polygons.length === 0
        ? undefined
        : {
            type: "MultiPolygon",
            coordinates: polygons
          },
    areaM2
  };
}

function findNextLoopCandidate(input: {
  route: GeoPoint[];
  searchStartIndex: number;
  closeDistanceM: number;
  minLoopPointCount: number;
  minLoopDistanceM: number;
  minLoopAreaM2: number;
}) {
  let next:
    | {
        startIndex: number;
        endIndex: number;
        ring: GeoPoint[];
        closeDistanceM: number;
        distanceM: number;
        areaM2: number;
      }
    | undefined;

  for (let startIndex = input.searchStartIndex; startIndex <= input.route.length - input.minLoopPointCount; startIndex += 1) {
    const candidate = findBestLoopCandidateForStart({ ...input, startIndex });
    if (!candidate) continue;

    if (
      !next ||
      candidate.endIndex < next.endIndex ||
      (candidate.endIndex === next.endIndex && candidate.closeDistanceM < next.closeDistanceM)
    ) {
      next = candidate;
    }
  }

  return next;
}

function findBestLoopCandidateForStart(input: {
  route: GeoPoint[];
  searchStartIndex: number;
  startIndex: number;
  closeDistanceM: number;
  minLoopPointCount: number;
  minLoopDistanceM: number;
  minLoopAreaM2: number;
}) {
  let best:
    | {
        startIndex: number;
        endIndex: number;
        ring: GeoPoint[];
        closeDistanceM: number;
        distanceM: number;
        areaM2: number;
      }
    | undefined;
  const start = input.route[input.startIndex];
  if (!start) return undefined;

  for (let endIndex = input.startIndex + input.minLoopPointCount - 1; endIndex < input.route.length; endIndex += 1) {
    const latest = input.route[endIndex];
    if (!latest) continue;
    const closeDistanceM = getDistanceMeters(start, latest);
    if (best && closeDistanceM > best.closeDistanceM + closeDistanceHysteresisM) {
      return best;
    }
    if (closeDistanceM > input.closeDistanceM) continue;

    const segment = input.route.slice(input.startIndex, endIndex + 1);
    const distanceM = getRouteDistanceM(segment);
    if (distanceM < input.minLoopDistanceM) continue;

    const ring = closeRing(segment);
    const areaM2 = getRingAreaM2(ring);
    if (areaM2 < input.minLoopAreaM2) continue;

    if (!best || closeDistanceM < best.closeDistanceM || (closeDistanceM === best.closeDistanceM && endIndex < best.endIndex)) {
      best = {
        startIndex: input.startIndex,
        endIndex,
        ring,
        closeDistanceM,
        distanceM,
        areaM2
      };
    }
  }

  return best;
}

function closeRing(points: GeoPoint[]) {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return points;
  if (first.latitude === last.latitude && first.longitude === last.longitude) return points;
  return [...points, first];
}

function getRouteDistanceM(points: GeoPoint[]) {
  return points.reduce((distanceM, point, index) => {
    const previous = points[index - 1];
    return previous ? distanceM + getDistanceMeters(previous, point) : distanceM;
  }, 0);
}

function getRingAreaM2(ring: GeoPoint[]) {
  if (ring.length < 4) return 0;
  const referenceLatitudeRad = toRadians(ring.reduce((sum, point) => sum + point.latitude, 0) / ring.length);
  const projected = ring.map((point) => ({
    x: toRadians(point.longitude) * earthRadiusM * Math.cos(referenceLatitudeRad),
    y: toRadians(point.latitude) * earthRadiusM
  }));
  const signedArea = projected.reduce((sum, point, index) => {
    const next = projected[(index + 1) % projected.length];
    return next ? sum + point.x * next.y - next.x * point.y : sum;
  }, 0);

  return Math.abs(signedArea) / 2;
}

function toGeoPoint(point: LoopTerritoryPoint): GeoPoint {
  return {
    latitude: point.latitude,
    longitude: point.longitude
  };
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
