import type { GeoPoint, TerritoryGeometry } from "@terri/shared";

export type LatLngTuple = [number, number];

export const SHIBUYA_CENTER: LatLngTuple = [35.6595, 139.7005];

const LAT_SPAN = 0.0105;
const LNG_SPAN = 0.0125;
const FALLBACK_TERRITORY_BOUNDS = { left: 50, top: 50, width: 4, height: 4 };

export function screenPointToLatLng(point: { x: number; y: number }, center: LatLngTuple = SHIBUYA_CENTER): LatLngTuple {
  const [centerLat, centerLng] = center;
  const lat = centerLat + (50 - point.y) * (LAT_SPAN / 100);
  const lng = centerLng + (point.x - 50) * (LNG_SPAN / 100);

  return [roundCoord(lat), roundCoord(lng)];
}

export function latLngToScreenPoint(point: GeoPoint, center: LatLngTuple = SHIBUYA_CENTER) {
  const [centerLat, centerLng] = center;
  const x = 50 + ((point.longitude - centerLng) / LNG_SPAN) * 100;
  const y = 50 - ((point.latitude - centerLat) / LAT_SPAN) * 100;

  return {
    x: clampPercent(x),
    y: clampPercent(y)
  };
}

export function offsetLatLng(center: LatLngTuple, latOffset: number, lngOffset: number): LatLngTuple {
  return [roundCoord(center[0] + latOffset), roundCoord(center[1] + lngOffset)];
}

export function buildTerritoryPolygons(center: LatLngTuple = SHIBUYA_CENTER) {
  return {
    current: [
      offsetLatLng(center, 0.0026, -0.0039),
      offsetLatLng(center, 0.0018, 0.0028),
      offsetLatLng(center, -0.0018, 0.0039),
      offsetLatLng(center, -0.0042, -0.0012),
      offsetLatLng(center, -0.0017, -0.0046)
    ],
    friend: [
      offsetLatLng(center, 0.0034, 0.0022),
      offsetLatLng(center, 0.0023, 0.0061),
      offsetLatLng(center, -0.0004, 0.0049),
      offsetLatLng(center, -0.0008, 0.0017)
    ],
    preview: [
      offsetLatLng(center, 0.0024, 0.0008),
      offsetLatLng(center, 0.0038, 0.0064),
      offsetLatLng(center, 0.0006, 0.0074),
      offsetLatLng(center, -0.0012, 0.0023),
      offsetLatLng(center, 0.0004, -0.0008)
    ]
  };
}

export function buildTrackingRoute(center: LatLngTuple = SHIBUYA_CENTER): LatLngTuple[] {
  return [
    offsetLatLng(center, -0.0022, -0.0028),
    offsetLatLng(center, -0.0008, -0.0009),
    offsetLatLng(center, 0.0002, 0.0021),
    offsetLatLng(center, 0.0019, 0.0038),
    offsetLatLng(center, 0.0031, 0.0056)
  ];
}

export function projectTerritoryGeometryBounds(geometry: TerritoryGeometry, center: LatLngTuple = SHIBUYA_CENTER) {
  const coordinates = flattenTerritoryCoordinates(geometry).filter(([longitude, latitude]) => Number.isFinite(longitude) && Number.isFinite(latitude));
  if (coordinates.length === 0) {
    return { ...FALLBACK_TERRITORY_BOUNDS };
  }

  const points = coordinates.map(([longitude, latitude]) => latLngToScreenPoint({ latitude, longitude }, center));
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(4, maxX - minX);
  const height = Math.max(4, maxY - minY);

  return {
    left: clampPercent(Math.min(minX, 100 - width)),
    top: clampPercent(Math.min(minY, 100 - height)),
    width,
    height
  };
}

export function flattenTerritoryCoordinates(geometry: TerritoryGeometry): number[][] {
  if (geometry.type === "Polygon") {
    return geometry.coordinates.flat();
  }
  return geometry.coordinates.flat(2);
}

function roundCoord(value: number) {
  return Number(value.toFixed(6));
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Number(value.toFixed(2))));
}
