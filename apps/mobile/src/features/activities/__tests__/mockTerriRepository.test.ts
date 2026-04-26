import { colors } from "@/theme/tokens";
import { createMockTerriRepository } from "@/lib/repositories/mockTerriRepository";
import { RepositoryError } from "@/lib/repositories/terriRepository";

describe("mockTerriRepository", () => {
  test("Supabase差し替え前提のActivity契約で開始と完了を返す", async () => {
    const repository = createMockTerriRepository();
    const started = await repository.startActivity();
    const completed = await repository.completeActivity(started.activityId);

    expect(started.activityId).toBeTruthy();
    expect(completed.territory.areaKm2).toBeGreaterThan(0);
    expect(completed.stats.distanceKm).toBeGreaterThan(0);
  });

  test("activityIdが空ならnot-foundとして正規化したエラーを返す", async () => {
    const repository = createMockTerriRepository();

    await expect(repository.completeActivity("")).rejects.toEqual(
      new RepositoryError("アクティビティが見つかりません", "not-found")
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

  test("factoryごとに状態が分離される", async () => {
    const first = createMockTerriRepository();
    const second = createMockTerriRepository();

    await first.updateTerritoryColor(colors.mint);

    await expect(second.getProfile()).resolves.toMatchObject({ territoryColor: colors.coral });
  });
});
