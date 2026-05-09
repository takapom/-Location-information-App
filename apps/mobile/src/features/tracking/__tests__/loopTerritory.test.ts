import { buildLoopTerritoryPreview } from "@/features/tracking/services/loopTerritory";

const baseTime = Date.parse("2026-05-09T00:00:00.000Z");

function point(latitude: number, longitude: number, index: number) {
  return {
    latitude,
    longitude,
    accuracyM: 12,
    recordedAt: new Date(baseTime + index * 5000).toISOString()
  };
}

describe("buildLoopTerritoryPreview", () => {
  test("直線移動は軌跡として残すがテリトリー面積にしない", () => {
    const preview = buildLoopTerritoryPreview([
      point(35.66, 139.7, 0),
      point(35.6604, 139.7004, 1),
      point(35.6608, 139.7008, 2),
      point(35.6612, 139.7012, 3)
    ]);

    expect(preview.route).toHaveLength(4);
    expect(preview.geometry).toBeUndefined();
    expect(preview.areaM2).toBe(0);
    expect(preview.loops).toEqual([]);
  });

  test("任意の過去地点から500m以内に戻ったらループをテリトリー面にする", () => {
    const preview = buildLoopTerritoryPreview([
      point(35.66, 139.7, 0),
      point(35.6609, 139.7, 1),
      point(35.6609, 139.7011, 2),
      point(35.66, 139.7011, 3),
      point(35.66003, 139.70002, 4)
    ]);

    expect(preview.loops).toHaveLength(1);
    expect(preview.geometry?.type).toBe("MultiPolygon");
    expect(preview.geometry?.coordinates[0][0][0]).toEqual([139.7, 35.66]);
    expect(preview.areaM2).toBeGreaterThan(100);
  });

  test("1回の移動中に成立した複数ループをすべてプレビューへ含める", () => {
    const preview = buildLoopTerritoryPreview([
      point(35.66, 139.7, 0),
      point(35.6609, 139.7, 1),
      point(35.6609, 139.7011, 2),
      point(35.66, 139.7011, 3),
      point(35.66003, 139.70002, 4),
      point(35.6615, 139.702, 5),
      point(35.6624, 139.702, 6),
      point(35.6624, 139.7031, 7),
      point(35.6615, 139.7031, 8),
      point(35.66153, 139.70202, 9)
    ]);

    expect(preview.loops).toHaveLength(2);
    expect(preview.geometry?.type).toBe("MultiPolygon");
    expect(preview.geometry?.coordinates).toHaveLength(2);
    expect(preview.areaM2).toBeGreaterThan(200);
  });

  test("共有端点で連続する複数ループを別々のテリトリー面として検出する", () => {
    const preview = buildLoopTerritoryPreview([
      point(35.66, 139.7, 0),
      point(35.6609, 139.7, 1),
      point(35.6609, 139.7011, 2),
      point(35.66, 139.7011, 3),
      point(35.66, 139.7, 4),
      point(35.6591, 139.7, 5),
      point(35.6591, 139.7011, 6),
      point(35.66, 139.7011, 7),
      point(35.66, 139.7, 8)
    ]);

    expect(preview.loops).toHaveLength(2);
    expect(preview.loops.map((loop) => [loop.startIndex, loop.endIndex])).toEqual([
      [0, 4],
      [4, 8]
    ]);
    expect(preview.geometry?.coordinates).toHaveLength(2);
    expect(preview.areaM2).toBeGreaterThan(200);
  });

  test("後で開始点により近づいても最初に閉じた有効ループを採用する", () => {
    const preview = buildLoopTerritoryPreview([
      point(35.66, 139.7, 0),
      point(35.6609, 139.7, 1),
      point(35.6609, 139.7011, 2),
      point(35.66, 139.7011, 3),
      point(35.66005, 139.70005, 4),
      point(35.6614, 139.702, 5),
      point(35.6623, 139.702, 6),
      point(35.6623, 139.7031, 7),
      point(35.66, 139.7, 8)
    ]);

    expect(preview.loops[0]).toMatchObject({ startIndex: 0, endIndex: 4 });
  });

  test("小さすぎる囲みはユーザーにテリトリーとして見せない", () => {
    const preview = buildLoopTerritoryPreview([
      point(35.66, 139.7, 0),
      point(35.66002, 139.7, 1),
      point(35.66002, 139.70002, 2),
      point(35.66, 139.70002, 3),
      point(35.66, 139.7, 4)
    ]);

    expect(preview.geometry).toBeUndefined();
    expect(preview.areaM2).toBe(0);
  });
});
