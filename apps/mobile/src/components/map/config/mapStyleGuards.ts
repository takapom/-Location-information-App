import type { MapStyleConfig } from "./mapStyleConfig";

const OSM_OFFICIAL_TILE_HOST = "tile.openstreetmap.org";

export type ProductionMapStyleGuardInput = Pick<MapStyleConfig, "tileMode" | "styleUrl" | "attribution" | "allowOsmTiles" | "environment"> & {
  mapStyle?: unknown;
};

export function assertSafeProductionMapStyle(input: ProductionMapStyleGuardInput) {
  if (!input.attribution.trim()) {
    throw new Error("Map attribution is required.");
  }

  if (input.tileMode === "self-hosted-vector" && !input.styleUrl.trim()) {
    throw new Error("EXPO_PUBLIC_MAP_STYLE_URL is required for self-hosted-vector map tile mode.");
  }

  if (input.tileMode === "dev-osm-raster" && !input.allowOsmTiles) {
    throw new Error("OSM raster dev fallback is disabled by EXPO_PUBLIC_MAP_DEBUG_ALLOW_OSM_TILES.");
  }

  if (input.environment === "production" && input.tileMode === "dev-osm-raster") {
    throw new Error("Production map style must not use the OSM raster dev fallback.");
  }

  if (input.environment === "production" && containsOfficialOsmTileHost(input.mapStyle ?? input.styleUrl)) {
    throw new Error("Production map style must not reference tile.openstreetmap.org.");
  }
}

export function containsOfficialOsmTileHost(value: unknown): boolean {
  if (typeof value === "string") return value.includes(OSM_OFFICIAL_TILE_HOST);
  if (!value || typeof value !== "object") return false;

  return Object.values(value as Record<string, unknown>).some(containsOfficialOsmTileHost);
}
