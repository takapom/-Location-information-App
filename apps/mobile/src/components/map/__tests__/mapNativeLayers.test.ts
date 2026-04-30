import { colors } from "@/theme/tokens";
import {
  buildNativeFriendTerritoryFeatures,
  buildNativeLivePreviewFeatures,
  buildNativeRouteFeatures,
  MAPLIBRE_OSM_RASTER_STYLE,
  toNativeLngLat,
  toNativeMapCenter
} from "@/components/map/mapNativeLayers";

describe("mapNativeLayers", () => {
  test("Native MapLibreは実地図用のOSM raster tile styleを使う", () => {
    const osmSource = MAPLIBRE_OSM_RASTER_STYLE.sources.osm as { tiles: string[] };
    expect(osmSource.tiles[0]).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
    expect(MAPLIBRE_OSM_RASTER_STYLE.layers[0]).toMatchObject({
      id: "osm-raster",
      type: "raster",
      source: "osm"
    });
  });

  test("MapLibre向けに緯度経度をlongitude-latitude順へ変換する", () => {
    expect(toNativeLngLat({ latitude: 35.66, longitude: 139.7 })).toEqual([139.7, 35.66]);
    expect(toNativeMapCenter({ latitude: 35.661, longitude: 139.701 })).toEqual([139.701, 35.661]);
  });

  test("友達の確定済み陣地をMapLibre GeoJSON FeatureCollectionへ変換する", () => {
    const features = buildNativeFriendTerritoryFeatures([
      {
        id: "territory-sakura-final",
        friendUserId: "sakura",
        displayName: "Sakura",
        color: colors.mint,
        areaKm2: 0.42,
        calculatedAt: "2026-04-30T00:00:00.000Z",
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [139.699, 35.661],
              [139.701, 35.661],
              [139.701, 35.659],
              [139.699, 35.659],
              [139.699, 35.661]
            ]
          ]
        }
      }
    ]);

    expect(features.features).toHaveLength(1);
    expect(features.features[0]).toMatchObject({
      id: "territory-sakura-final",
      properties: {
        friendUserId: "sakura",
        color: colors.mint,
        areaKm2: 0.42
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [139.699, 35.661],
            [139.701, 35.661],
            [139.701, 35.659],
            [139.699, 35.659],
            [139.699, 35.661]
          ]
        ]
      }
    });
  });

  test("live previewとrouteは状態に応じて別レイヤーとして生成する", () => {
    expect(buildNativeLivePreviewFeatures(undefined, false).features).toHaveLength(0);
    expect(buildNativeRouteFeatures(undefined, false).features).toHaveLength(0);

    expect(buildNativeLivePreviewFeatures({ latitude: 35.66, longitude: 139.7 }, true).features[0]).toMatchObject({
      properties: { color: colors.coral },
      geometry: { type: "Polygon" }
    });
    expect(buildNativeRouteFeatures({ latitude: 35.66, longitude: 139.7 }, true).features[0]).toMatchObject({
      properties: { color: colors.coral },
      geometry: { type: "LineString" }
    });
  });
});
