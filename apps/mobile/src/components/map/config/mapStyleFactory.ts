import type { StyleSpecification } from "@maplibre/maplibre-react-native";
import { readMapStyleConfig, type MapStyleConfig } from "./mapStyleConfig";
import { assertSafeProductionMapStyle } from "./mapStyleGuards";

export const DEV_OSM_RASTER_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export type MapLibreStyleInput = MapStyleConfig;

export function buildDevOsmRasterStyle(attribution: string): StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: [DEV_OSM_RASTER_TILE_URL],
        tileSize: 256,
        attribution
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
}

export function resolveMapLibreStyle(config: MapLibreStyleInput = readMapStyleConfig()): StyleSpecification | string {
  const mapStyle = config.tileMode === "self-hosted-vector" ? config.styleUrl : buildDevOsmRasterStyle(config.attribution);
  assertSafeProductionMapStyle({ ...config, mapStyle });
  return mapStyle;
}

export function resolveLeafletDevRasterTileUrl(config: MapLibreStyleInput = readMapStyleConfig()): string | undefined {
  assertSafeProductionMapStyle(config);
  return config.tileMode === "dev-osm-raster" ? DEV_OSM_RASTER_TILE_URL : undefined;
}

