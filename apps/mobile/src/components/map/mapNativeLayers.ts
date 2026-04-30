import type { FriendTerritory, GeoPoint, TerritoryColor, TerritoryGeometry } from "@terri/shared";
import type { StyleSpecification } from "@maplibre/maplibre-react-native";
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry, LineString, MultiPolygon, Polygon } from "geojson";
import { colors } from "@/theme/tokens";
import { buildTerritoryPolygons, buildTrackingRoute, SHIBUYA_CENTER, type LatLngTuple } from "./mapGeometry";

export const MAPLIBRE_OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors"
    }
  },
  layers: [
    {
      id: "osm-raster",
      type: "raster",
      source: "osm",
      paint: {
        "raster-saturation": -0.25,
        "raster-contrast": -0.08,
        "raster-brightness-min": 0.04,
        "raster-brightness-max": 1
      }
    }
  ]
};

type Position = [number, number];

export type NativeFeatureCollection<TGeometry extends Geometry = Geometry> = FeatureCollection<TGeometry, GeoJsonProperties>;

export function toNativeLngLat(point: GeoPoint): Position {
  return [point.longitude, point.latitude];
}

export function toNativeMapCenter(point?: GeoPoint): Position {
  const [latitude, longitude] = point ? [point.latitude, point.longitude] : SHIBUYA_CENTER;
  return [longitude, latitude];
}

export function buildNativeBaseTerritoryFeatures(center?: GeoPoint): NativeFeatureCollection<Polygon> {
  const polygons = buildTerritoryPolygons(toLatLngTuple(center));
  return {
    type: "FeatureCollection",
    features: [
      polygonFeature("native-mine-current", colors.coral, polygons.current),
      polygonFeature("native-friend-context", colors.mint, polygons.friend)
    ]
  };
}

export function buildNativeLivePreviewFeatures(center?: GeoPoint, live = false): NativeFeatureCollection<Polygon> {
  if (!live) return emptyFeatureCollection();
  return {
    type: "FeatureCollection",
    features: [polygonFeature("native-live-preview", colors.coral, buildTerritoryPolygons(toLatLngTuple(center)).preview)]
  };
}

export function buildNativeRouteFeatures(center?: GeoPoint, showRoute = false): NativeFeatureCollection<LineString> {
  if (!showRoute) return emptyFeatureCollection();
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: "native-tracking-route",
        properties: { color: colors.coral },
        geometry: {
          type: "LineString",
          coordinates: buildTrackingRoute(toLatLngTuple(center)).map(latLngToPosition)
        }
      }
    ]
  };
}

export function buildNativeFriendTerritoryFeatures(friendTerritories: FriendTerritory[]): NativeFeatureCollection<Polygon | MultiPolygon> {
  return {
    type: "FeatureCollection",
    features: friendTerritories.map((territory) => ({
      type: "Feature",
      id: territory.id,
      properties: {
        id: territory.id,
        friendUserId: territory.friendUserId,
        displayName: territory.displayName,
        color: territory.color,
        areaKm2: territory.areaKm2
      },
      geometry: territoryGeometryToNativeGeometry(territory.polygon)
    }))
  };
}

function emptyFeatureCollection<TGeometry extends Geometry>(): NativeFeatureCollection<TGeometry> {
  return { type: "FeatureCollection", features: [] };
}

function toLatLngTuple(point?: GeoPoint): LatLngTuple {
  return point ? [point.latitude, point.longitude] : SHIBUYA_CENTER;
}

function polygonFeature(id: string, color: TerritoryColor, polygon: LatLngTuple[]): Feature<Polygon> {
  return {
    type: "Feature" as const,
    id,
    properties: { color },
    geometry: {
      type: "Polygon" as const,
      coordinates: [polygon.map(latLngToPosition)]
    }
  };
}

function territoryGeometryToNativeGeometry(geometry: TerritoryGeometry): Polygon | MultiPolygon {
  if (geometry.type === "Polygon") {
    return {
      type: "Polygon" as const,
      coordinates: geometry.coordinates.map((ring) => ring.map(([longitude, latitude]) => [longitude, latitude] as Position))
    };
  }

  return {
    type: "MultiPolygon" as const,
    coordinates: geometry.coordinates.map((polygon) => polygon.map((ring) => ring.map(([longitude, latitude]) => [longitude, latitude] as Position)))
  };
}

function latLngToPosition([latitude, longitude]: LatLngTuple): Position {
  return [longitude, latitude];
}
