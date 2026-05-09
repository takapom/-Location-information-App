import { buildDevOsmRasterStyle, DEV_OSM_RASTER_TILE_URL, resolveMapLibreStyle } from "../mapStyleFactory";

describe("mapStyleFactory", () => {
  test("dev-osm-rasterではraster style objectを返す", () => {
    const style = resolveMapLibreStyle({
      tileMode: "dev-osm-raster",
      styleUrl: "",
      attribution: "© OpenStreetMap contributors",
      allowOsmTiles: true,
      environment: "development"
    });

    expect(typeof style).toBe("object");
    expect(style).toMatchObject({
      version: 8,
      layers: [{ id: "osm-raster", type: "raster", source: "osm" }]
    });
  });

  test("self-hosted-vectorではstyle URLを返す", () => {
    const style = resolveMapLibreStyle({
      tileMode: "self-hosted-vector",
      styleUrl: "https://maps.terri.example/styles/terri.json",
      attribution: "© OpenStreetMap contributors",
      allowOsmTiles: false,
      environment: "production"
    });

    expect(style).toBe("https://maps.terri.example/styles/terri.json");
  });

  test("raster styleにはattributionとOSM dev tile URLが含まれる", () => {
    const style = buildDevOsmRasterStyle("© OpenStreetMap contributors");
    const osmSource = style.sources.osm as { tiles: string[]; attribution: string };

    expect(osmSource.attribution).toBe("© OpenStreetMap contributors");
    expect(osmSource.tiles).toEqual([DEV_OSM_RASTER_TILE_URL]);
  });

  test("Release構成のJS bundleでも地図環境がdevelopmentならdev fallbackを使える", () => {
    const style = resolveMapLibreStyle({
      tileMode: "dev-osm-raster",
      styleUrl: "",
      attribution: "© OpenStreetMap contributors",
      allowOsmTiles: true,
      environment: "development"
    });

    expect(typeof style).toBe("object");
  });
});
