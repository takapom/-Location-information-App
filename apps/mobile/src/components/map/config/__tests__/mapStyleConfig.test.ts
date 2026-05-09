import { readMapStyleConfig } from "../mapStyleConfig";

describe("mapStyleConfig", () => {
  test("デフォルトではdev-osm-rasterになる", () => {
    const config = readMapStyleConfig({});

    expect(config.tileMode).toBe("dev-osm-raster");
    expect(config.environment).toBe("development");
  });

  test("envからself-hosted-vectorとstyle URLを読める", () => {
    const config = readMapStyleConfig({
      EXPO_PUBLIC_MAP_TILE_MODE: "self-hosted-vector",
      EXPO_PUBLIC_MAP_STYLE_URL: "https://maps.terri.example/styles/terri.json"
    });

    expect(config.tileMode).toBe("self-hosted-vector");
    expect(config.styleUrl).toBe("https://maps.terri.example/styles/terri.json");
  });

  test("attributionとOSM fallback可否を読む", () => {
    const config = readMapStyleConfig({
      EXPO_PUBLIC_MAP_ATTRIBUTION: "© Example contributors",
      EXPO_PUBLIC_MAP_DEBUG_ALLOW_OSM_TILES: "false"
    });

    expect(config.attribution).toBe("© Example contributors");
    expect(config.allowOsmTiles).toBe(false);
  });

  test("地図本番環境はNODE_ENV productionを基本にしつつEXPO_PUBLIC_MAP_ENVで上書きできる", () => {
    expect(readMapStyleConfig({ NODE_ENV: "production" }).environment).toBe("production");
    expect(readMapStyleConfig({ NODE_ENV: "production", EXPO_PUBLIC_MAP_ENV: "development" }).environment).toBe("development");
    expect(readMapStyleConfig({ EXPO_PUBLIC_MAP_ENV: "production" }).environment).toBe("production");
  });
});
