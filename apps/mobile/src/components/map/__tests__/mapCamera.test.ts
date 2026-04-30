import { MAP_INITIAL_ZOOM, MAP_MAX_ZOOM, MAP_MIN_ZOOM, shouldAutoCenterMap, toLatLngKey } from "@/components/map/mapCamera";

describe("mapCamera", () => {
  test("初期ズームは詳細表示、最小ズームは広域表示を許可する", () => {
    expect(MAP_INITIAL_ZOOM).toBe(16);
    expect(MAP_MIN_ZOOM).toBeLessThanOrEqual(8);
    expect(MAP_MAX_ZOOM).toBeGreaterThan(MAP_INITIAL_ZOOM);
  });

  test("同じ座標なら別インスタンスでも同じキーになる", () => {
    expect(toLatLngKey([35.66, 139.7])).toBe(toLatLngKey([35.6600002, 139.7000002]));
  });

  test("ユーザーが地図を動かした後は自動で現在地へ戻さない", () => {
    expect(
      shouldAutoCenterMap({
        hasUserMovedMap: true,
        previousCenterKey: toLatLngKey([35.66, 139.7]),
        nextCenterKey: toLatLngKey([35.661, 139.701])
      })
    ).toBe(false);
  });

  test("ユーザー操作前は中心座標が変わった時だけ追従する", () => {
    expect(
      shouldAutoCenterMap({
        hasUserMovedMap: false,
        previousCenterKey: toLatLngKey([35.66, 139.7]),
        nextCenterKey: toLatLngKey([35.661, 139.701])
      })
    ).toBe(true);
    expect(
      shouldAutoCenterMap({
        hasUserMovedMap: false,
        previousCenterKey: toLatLngKey([35.66, 139.7]),
        nextCenterKey: toLatLngKey([35.66, 139.7])
      })
    ).toBe(false);
  });
});
