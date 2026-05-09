import { buildDevOsmRasterStyle, toNativeLngLat, toNativeMapCenter } from "@/components/map/mapNativeLayers";

describe("mapNativeLayers", () => {
  test("Native MapLibreのdev fallback styleはfactoryから取得する", () => {
    const style = buildDevOsmRasterStyle("© OpenStreetMap contributors");
    const osmSource = style.sources.osm as { tiles: string[] };
    expect(osmSource.tiles[0]).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
    expect(style.layers[0]).toMatchObject({
      id: "osm-raster",
      type: "raster",
      source: "osm"
    });
  });

  test("MapLibre向けに緯度経度をlongitude-latitude順へ変換する", () => {
    expect(toNativeLngLat({ latitude: 35.66, longitude: 139.7 })).toEqual([139.7, 35.66]);
    expect(toNativeMapCenter({ latitude: 35.661, longitude: 139.701 })).toEqual([139.701, 35.661]);
  });
});
