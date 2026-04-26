import { buildTerritoryPolygons, latLngToScreenPoint, screenPointToLatLng, SHIBUYA_CENTER } from "@/components/map/mapGeometry";
import { buildFriendLayerKey } from "@/components/map/mapLayerKeys";
import { colors } from "@/theme/tokens";

describe("mapGeometry", () => {
  test("画面中央の相対座標は渋谷中心座標へ変換される", () => {
    expect(screenPointToLatLng({ x: 50, y: 50 })).toEqual(SHIBUYA_CENTER);
  });

  test("渋谷中心座標は画面中央の相対座標へ変換される", () => {
    expect(latLngToScreenPoint({ latitude: SHIBUYA_CENTER[0], longitude: SHIBUYA_CENTER[1] })).toEqual({ x: 50, y: 50 });
  });

  test("右上の相対座標は北東方向の緯度経度へ変換される", () => {
    const [lat, lng] = screenPointToLatLng({ x: 70, y: 30 });

    expect(lat).toBeGreaterThan(SHIBUYA_CENTER[0]);
    expect(lng).toBeGreaterThan(SHIBUYA_CENTER[1]);
  });

  test("陣地ポリゴンは描画に必要な頂点数を持つ", () => {
    const polygons = buildTerritoryPolygons();

    expect(polygons.current.length).toBeGreaterThanOrEqual(4);
    expect(polygons.friend.length).toBeGreaterThanOrEqual(4);
    expect(polygons.preview.length).toBeGreaterThanOrEqual(4);
  });

  test("友達レイヤーkeyは同じ描画内容なら安定する", () => {
    const friend = {
      id: "sakura",
      displayName: "Sakura",
      initials: "S",
      color: colors.coral,
      totalAreaKm2: 1.5,
      isActive: true,
      updatedLabel: "今",
      latitude: 35.661,
      longitude: 139.699
    };

    expect(buildFriendLayerKey([friend])).toBe(buildFriendLayerKey([{ ...friend }]));
  });
});
