import { colors } from "@/theme/tokens";
import { toLivePreviewFeatureCollection, toMapLibreLngLat, toTerritoryFeatureCollection, toTrackingRouteFeatureCollection } from "../mapFeatureCollections";

const territory = {
  id: "territory-sakura-final",
  userId: "sakura",
  displayName: "Sakura",
  color: colors.mint,
  areaKm2: 0.42,
  geometry: {
    type: "Polygon" as const,
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
};

describe("mapFeatureCollections", () => {
  test("緯度経度をMapLibre用のlongitude-latitude順へ変換する", () => {
    expect(toMapLibreLngLat({ latitude: 35.66, longitude: 139.7 })).toEqual([139.7, 35.66]);
  });

  test("friend final territoryをGeoJSON FeatureCollectionへ変換する", () => {
    const features = toTerritoryFeatureCollection([territory]);

    expect(features.features[0]).toMatchObject({
      id: "territory-sakura-final",
      properties: {
        userId: "sakura",
        color: colors.mint,
        areaKm2: 0.42
      },
      geometry: territory.geometry
    });
  });

  test("live previewを別FeatureCollectionとして変換する", () => {
    const features = toLivePreviewFeatureCollection({ ...territory, id: "live-preview", color: colors.coral });

    expect(features.features).toHaveLength(1);
    expect(features.features[0]).toMatchObject({
      id: "live-preview",
      properties: { color: colors.coral }
    });
  });

  test("tracking routeをLineString FeatureCollectionとして変換する", () => {
    const features = toTrackingRouteFeatureCollection({
      id: "route",
      color: colors.coral,
      coordinates: [
        { latitude: 35.66, longitude: 139.7 },
        { latitude: 35.661, longitude: 139.701 }
      ]
    });

    expect(features.features[0]).toMatchObject({
      id: "route",
      properties: { color: colors.coral },
      geometry: {
        type: "LineString",
        coordinates: [
          [139.7, 35.66],
          [139.701, 35.661]
        ]
      }
    });
  });

  test("empty stateでは空FeatureCollectionを返す", () => {
    expect(toTerritoryFeatureCollection([]).features).toEqual([]);
    expect(toLivePreviewFeatureCollection().features).toEqual([]);
    expect(toTrackingRouteFeatureCollection().features).toEqual([]);
  });
});

