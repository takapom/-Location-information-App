import type { GeoPoint } from "@terri/shared";
import { SHIBUYA_CENTER } from "./mapGeometry";

export { buildDevOsmRasterStyle } from "./config/mapStyleFactory";
export {
  emptyFeatureCollection,
  toLivePreviewFeatureCollection,
  toMapLibreLngLat as toNativeLngLat,
  toTerritoryFeatureCollection,
  toTrackingRouteFeatureCollection,
  type MapFeatureCollection as NativeFeatureCollection
} from "./layers/mapFeatureCollections";

export function toNativeMapCenter(point?: GeoPoint): [number, number] {
  const [latitude, longitude] = point ? [point.latitude, point.longitude] : SHIBUYA_CENTER;
  return [longitude, latitude];
}
