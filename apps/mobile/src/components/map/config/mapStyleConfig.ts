export type MapTileMode = "dev-osm-raster" | "self-hosted-vector";
export type MapEnvironment = "development" | "production";

export type MapStyleConfig = {
  tileMode: MapTileMode;
  styleUrl: string;
  attribution: string;
  allowOsmTiles: boolean;
  environment: MapEnvironment;
};

const DEFAULT_TILE_MODE: MapTileMode = "dev-osm-raster";
const DEFAULT_ATTRIBUTION = "© OpenStreetMap contributors";

type MapStyleEnv = Partial<Record<string, string | undefined>>;

export function readMapStyleConfig(env: MapStyleEnv = process.env): MapStyleConfig {
  return {
    tileMode: parseTileMode(env.EXPO_PUBLIC_MAP_TILE_MODE),
    styleUrl: env.EXPO_PUBLIC_MAP_STYLE_URL?.trim() ?? "",
    attribution: env.EXPO_PUBLIC_MAP_ATTRIBUTION?.trim() || DEFAULT_ATTRIBUTION,
    allowOsmTiles: parseBoolean(env.EXPO_PUBLIC_MAP_DEBUG_ALLOW_OSM_TILES, true),
    environment: parseEnvironment(env.EXPO_PUBLIC_MAP_ENV, env.NODE_ENV)
  };
}

function parseTileMode(value?: string): MapTileMode {
  if (value === "self-hosted-vector") return "self-hosted-vector";
  return DEFAULT_TILE_MODE;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === "") return fallback;
  return value.toLowerCase() === "true";
}

function parseEnvironment(value?: string, nodeEnv?: string): MapEnvironment {
  if (value === "production") return "production";
  if (value === "development") return "development";
  if (nodeEnv === "production") return "production";
  return "development";
}
