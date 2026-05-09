import type { GeoPoint, TerritoryGeometry } from "@terri/shared";
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry, LineString, MultiPolygon, Polygon } from "geojson";
import type { MapRouteFeature, MapTerritoryFeature } from "../scene/mapSceneTypes";

type Position = [number, number];

export type MapFeatureCollection<TGeometry extends Geometry = Geometry> = FeatureCollection<TGeometry, GeoJsonProperties>;

export function toMapLibreLngLat(point: GeoPoint): Position {
  return [point.longitude, point.latitude];
}

export function toTerritoryFeatureCollection(features: MapTerritoryFeature[]): MapFeatureCollection<Polygon | MultiPolygon> {
  return {
    type: "FeatureCollection",
    features: features.map((feature) => territoryFeatureToGeoJson(feature))
  };
}

export function toLivePreviewFeatureCollection(feature?: MapTerritoryFeature): MapFeatureCollection<Polygon | MultiPolygon> {
  return toTerritoryFeatureCollection(feature ? [feature] : []);
}

export function toTrackingRouteFeatureCollection(route?: MapRouteFeature): MapFeatureCollection<LineString> {
  if (!route || route.coordinates.length === 0) return emptyFeatureCollection();

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: route.id,
        properties: {
          id: route.id,
          color: route.color
        },
        geometry: {
          type: "LineString",
          coordinates: route.coordinates.map(toMapLibreLngLat)
        }
      }
    ]
  };
}

export function emptyFeatureCollection<TGeometry extends Geometry>(): MapFeatureCollection<TGeometry> {
  return { type: "FeatureCollection", features: [] };
}

function territoryFeatureToGeoJson(feature: MapTerritoryFeature): Feature<Polygon | MultiPolygon> {
  return {
    type: "Feature",
    id: feature.id,
    properties: {
      id: feature.id,
      userId: feature.userId,
      displayName: feature.displayName,
      color: feature.color,
      areaKm2: feature.areaKm2
    },
    geometry: territoryGeometryToMapLibreGeometry(feature.geometry)
  };
}

function territoryGeometryToMapLibreGeometry(geometry: TerritoryGeometry): Polygon | MultiPolygon {
  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map((ring) => ring.map(toPosition))
    };
  }

  return {
    type: "MultiPolygon",
    coordinates: geometry.coordinates.map((polygon) => polygon.map((ring) => ring.map(toPosition)))
  };
}

function toPosition([longitude, latitude]: number[]): Position {
  return [longitude, latitude];
}

