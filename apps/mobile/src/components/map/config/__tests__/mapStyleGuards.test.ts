import { buildDevOsmRasterStyle } from "../mapStyleFactory";
import { assertSafeProductionMapStyle, containsOfficialOsmTileHost } from "../mapStyleGuards";

describe("mapStyleGuards", () => {
  test("productionでtile.openstreetmap.orgを含むstyleを拒否する", () => {
    expect(() =>
      assertSafeProductionMapStyle({
        tileMode: "self-hosted-vector",
        styleUrl: "https://maps.terri.example/styles/terri.json",
        attribution: "© OpenStreetMap contributors",
        allowOsmTiles: false,
        environment: "production",
        mapStyle: buildDevOsmRasterStyle("© OpenStreetMap contributors")
      })
    ).toThrow("tile.openstreetmap.org");
  });

  test("productionでdev-osm-raster modeを拒否する", () => {
    expect(() =>
      assertSafeProductionMapStyle({
        tileMode: "dev-osm-raster",
        styleUrl: "",
        attribution: "© OpenStreetMap contributors",
        allowOsmTiles: true,
        environment: "production",
        mapStyle: buildDevOsmRasterStyle("© OpenStreetMap contributors")
      })
    ).toThrow("OSM raster dev fallback");
  });

  test("productionでattributionなしを拒否する", () => {
    expect(() =>
      assertSafeProductionMapStyle({
        tileMode: "self-hosted-vector",
        styleUrl: "https://maps.terri.example/styles/terri.json",
        attribution: "",
        allowOsmTiles: false,
        environment: "production"
      })
    ).toThrow("attribution");
  });

  test("self-hosted-vectorでstyle URLなしを拒否する", () => {
    expect(() =>
      assertSafeProductionMapStyle({
        tileMode: "self-hosted-vector",
        styleUrl: "",
        attribution: "© OpenStreetMap contributors",
        allowOsmTiles: false,
        environment: "production"
      })
    ).toThrow("MAP_STYLE_URL");
  });

  test("dev modeではOSM raster fallbackを許可できる", () => {
    expect(() =>
      assertSafeProductionMapStyle({
        tileMode: "dev-osm-raster",
        styleUrl: "",
        attribution: "© OpenStreetMap contributors",
        allowOsmTiles: true,
        environment: "development",
        mapStyle: buildDevOsmRasterStyle("© OpenStreetMap contributors")
      })
    ).not.toThrow();
  });

  test("dev modeでもdebug fallbackが無効ならOSM raster fallbackを拒否する", () => {
    expect(() =>
      assertSafeProductionMapStyle({
        tileMode: "dev-osm-raster",
        styleUrl: "",
        attribution: "© OpenStreetMap contributors",
        allowOsmTiles: false,
        environment: "development",
        mapStyle: buildDevOsmRasterStyle("© OpenStreetMap contributors")
      })
    ).toThrow("DEBUG_ALLOW_OSM_TILES");
  });

  test("style object内のOSM公式tile hostを検出する", () => {
    expect(containsOfficialOsmTileHost({ sources: { osm: { tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"] } } })).toBe(true);
  });
});
