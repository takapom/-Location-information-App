import { colors } from "@/theme/tokens";
import { createMockTerriRepository } from "@/lib/repositories/mockTerriRepository";
import { RepositoryError } from "@/lib/repositories/terriRepository";

describe("mockTerriRepository", () => {
  test("Supabase差し替え前提の日次Activity契約でensureとsyncを返す", async () => {
    const repository = createMockTerriRepository();
    const dailyActivity = await repository.ensureDailyActivity({ localDate: "2026-04-26", timezone: "Asia/Tokyo" });
    const synced = await repository.syncLiveTerritory(dailyActivity.id);

    expect(dailyActivity.id).toBe("daily-2026-04-26");
    expect(synced.territory.areaKm2).toBe(0);
    expect(synced.stats.distanceKm).toBe(0);
  });

  test("存在しないdailyActivityIdならnot-foundとして正規化したエラーを返す", async () => {
    const repository = createMockTerriRepository();

    await expect(repository.syncLiveTerritory("missing")).rejects.toEqual(
      new RepositoryError("日次アクティビティが見つかりません", "not-found")
    );
  });

  test("同じlocalDateのensureDailyActivityは冪等に同じ日次Activityを返す", async () => {
    const repository = createMockTerriRepository();
    const first = await repository.ensureDailyActivity({ localDate: "2026-04-26", timezone: "Asia/Tokyo" });
    const second = await repository.ensureDailyActivity({ localDate: "2026-04-26", timezone: "Asia/Tokyo" });

    expect(second).toEqual(first);
  });

  test("テリトリー生成OFFでは日次Activityを作成しない", async () => {
    const repository = createMockTerriRepository();
    await repository.updateProfile({ territoryCaptureEnabled: false });

    await expect(repository.ensureDailyActivity({ localDate: "2026-04-26", timezone: "Asia/Tokyo" })).rejects.toEqual(
      new RepositoryError("テリトリー生成がOFFです", "permission-denied")
    );
  });

  test("GPS点を2点以上追加してlive territoryを同期できる", async () => {
    const repository = createMockTerriRepository();
    const dailyActivity = await repository.ensureDailyActivity({ localDate: "2026-04-26", timezone: "Asia/Tokyo" });

    await repository.appendLocationPoint({
      dailyActivityId: dailyActivity.id,
      latitude: 35.66,
      longitude: 139.7,
      accuracyM: 12,
      speedMps: 1.2,
      recordedAt: "2026-04-26T03:00:00.000Z"
    });
    await repository.appendLocationPoint({
      dailyActivityId: dailyActivity.id,
      latitude: 35.661,
      longitude: 139.701,
      accuracyM: 10,
      speedMps: 1.4,
      recordedAt: "2026-04-26T03:00:05.000Z"
    });

    const synced = await repository.syncLiveTerritory(dailyActivity.id);

    expect(synced.dailyActivity.id).toBe(dailyActivity.id);
    expect(synced.territory.id).toBe(dailyActivity.id);
    expect(synced.territory.areaKm2).toBeGreaterThan(0);
    expect(synced.territory.distanceKm).toBeGreaterThan(0);
  });

  test("低精度GPS点だけではlive territoryの距離と面積を増やさない", async () => {
    const repository = createMockTerriRepository();
    const dailyActivity = await repository.ensureDailyActivity({ localDate: "2026-04-26", timezone: "Asia/Tokyo" });

    await repository.appendLocationPoint({
      dailyActivityId: dailyActivity.id,
      latitude: 35.66,
      longitude: 139.7,
      accuracyM: 80,
      speedMps: 1.2,
      recordedAt: "2026-04-26T03:00:00.000Z"
    });

    await expect(repository.syncLiveTerritory(dailyActivity.id)).resolves.toMatchObject({
      stats: { distanceKm: 0, previewAreaKm2: 0 },
      territory: { areaKm2: 0, distanceKm: 0 }
    });
  });

  test("日次確定は再試行でき、確定後のGPS追加は拒否する", async () => {
    const repository = createMockTerriRepository();
    const dailyActivity = await repository.ensureDailyActivity({ localDate: "2026-04-26", timezone: "Asia/Tokyo" });

    await repository.appendLocationPoint({
      dailyActivityId: dailyActivity.id,
      latitude: 35.66,
      longitude: 139.7,
      accuracyM: 12,
      speedMps: 1.2,
      recordedAt: "2026-04-26T03:00:00.000Z"
    });
    await repository.appendLocationPoint({
      dailyActivityId: dailyActivity.id,
      latitude: 35.661,
      longitude: 139.701,
      accuracyM: 10,
      speedMps: 1.4,
      recordedAt: "2026-04-26T03:00:05.000Z"
    });

    const finalized = await repository.finalizeDailyActivity(dailyActivity.id);
    const retry = await repository.finalizeDailyActivity(dailyActivity.id);

    expect(finalized.dailyActivity.status).toBe("finalized");
    expect(retry).toEqual(finalized);
    await expect(
      repository.appendLocationPoint({
        dailyActivityId: dailyActivity.id,
        latitude: 35.662,
        longitude: 139.702,
        accuracyM: 10,
        speedMps: 1.4,
        recordedAt: "2026-04-26T03:00:10.000Z"
      })
    ).rejects.toEqual(new RepositoryError("確定済みの日次アクティビティにはGPS点を追加できません", "invalid-state"));
    await expect(repository.syncLiveTerritory(dailyActivity.id)).rejects.toEqual(
      new RepositoryError("確定済みの日次アクティビティは同期できません", "invalid-state")
    );
  });

  test("プロフィールの陣地色を更新できる", async () => {
    const repository = createMockTerriRepository();
    const profile = await repository.updateTerritoryColor(colors.mint);

    expect(profile.territoryColor).toBe(colors.mint);
  });

  test("プロフィール設定を更新できる", async () => {
    const repository = createMockTerriRepository();
    const profile = await repository.updateProfile({ locationSharingEnabled: false });

    expect(profile.locationSharingEnabled).toBe(false);
  });

  test("activityIdから履歴詳細を取得できる", async () => {
    const repository = createMockTerriRepository();

    await expect(repository.getActivity("today")).resolves.toMatchObject({ id: "today", distanceKm: 5.2 });
  });

  test("ランキングはRankingEntry契約を保ち現在ユーザーを含む", async () => {
    const repository = createMockTerriRepository();

    await expect(repository.getRankings()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rank: 1, areaKm2: 8.4, deltaKm2: expect.any(Number) }),
        expect.objectContaining({ id: "user-current", isCurrentUser: true })
      ])
    );
    expect((await repository.getRankings()).some((entry) => entry.deltaKm2 !== 0)).toBe(true);
  });

  test("友達の確定済み陣地をFriendTerritory契約で返す", async () => {
    const repository = createMockTerriRepository();

    await expect(repository.getFriendTerritories()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "territory-sakura-final",
          friendUserId: "sakura",
          polygon: expect.objectContaining({ type: "Polygon" })
        })
      ])
    );
  });

  test("友達陣地のGeoJSONは呼び出し元の変更から内部状態を守る", async () => {
    const repository = createMockTerriRepository();
    const first = await repository.getFriendTerritories();
    const firstPolygon = first[0]?.polygon;
    if (!firstPolygon || firstPolygon.type !== "Polygon") throw new Error("mock fixture must include polygon territory");

    firstPolygon.coordinates[0][0][0] = 0;

    const second = await repository.getFriendTerritories();
    const secondPolygon = second[0]?.polygon;
    if (!secondPolygon || secondPolygon.type !== "Polygon") throw new Error("mock fixture must include polygon territory");

    expect(secondPolygon.coordinates[0][0][0]).toBe(139.696);
  });

  test("ユーザーID検索から友達申請をpendingで作成できる", async () => {
    const repository = createMockTerriRepository();

    await expect(repository.searchFriendsByCode("RI")).resolves.toEqual([
      expect.objectContaining({ friendCode: "RIKU2026", requestStatus: "none" })
    ]);

    await expect(repository.requestFriendByCode("RIKU2026")).resolves.toMatchObject({
      receiverUserId: "riku",
      status: "pending"
    });
    await expect(repository.searchFriendsByCode("RI")).resolves.toEqual([
      expect.objectContaining({ friendCode: "RIKU2026", requestStatus: "pending" })
    ]);
  });

  test("受信した友達申請を承認すると友達一覧へ反映される", async () => {
    const repository = createMockTerriRepository();

    await expect(repository.getIncomingFriendRequests()).resolves.toEqual([
      expect.objectContaining({ friendshipId: "friendship-yui", requesterUserId: "yui" })
    ]);

    await expect(repository.respondFriendRequest("friendship-yui", "accept")).resolves.toMatchObject({
      friendshipId: "friendship-yui",
      requesterUserId: "yui",
      status: "accepted"
    });
    await expect(repository.getIncomingFriendRequests()).resolves.toEqual([]);
    await expect(repository.getFriends()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ id: "yui" }), expect.objectContaining({ id: "sakura" })]));
  });

  test("受信した友達申請を拒否すると申請だけ消え、再申請可能な状態にする", async () => {
    const repository = createMockTerriRepository();

    await expect(repository.respondFriendRequest("friendship-yui", "reject")).resolves.toMatchObject({
      friendshipId: "friendship-yui",
      requesterUserId: "yui",
      status: "rejected"
    });

    await expect(repository.getIncomingFriendRequests()).resolves.toEqual([]);
    await expect(repository.getFriends()).resolves.not.toEqual(expect.arrayContaining([expect.objectContaining({ id: "yui" })]));
  });

  test("送信済み申請を自分で承認することはできない", async () => {
    const repository = createMockTerriRepository();

    await expect(repository.respondFriendRequest("friendship-mei", "accept")).rejects.toEqual(
      new RepositoryError("受信した友達申請だけ操作できます", "permission-denied")
    );
  });

  test("存在しないユーザーIDへの友達申請はnot-foundを返す", async () => {
    const repository = createMockTerriRepository();

    await expect(repository.requestFriendByCode("MISSING")).rejects.toEqual(new RepositoryError("ユーザーが見つかりません", "not-found"));
  });

  test("factoryごとに状態が分離される", async () => {
    const first = createMockTerriRepository();
    const second = createMockTerriRepository();

    await first.updateTerritoryColor(colors.mint);

    await expect(second.getProfile()).resolves.toMatchObject({ territoryColor: colors.coral });
  });
});
