import { Share } from "react-native";
import { colors } from "@/theme/tokens";
import { buildTerritoryShareCardData, buildTerritoryShareMessage, shareTerritorySummary } from "@/features/activities/activityShare";

const activity = {
  id: "today",
  title: "今日",
  areaKm2: 1.234,
  distanceKm: 5.67,
  duration: "42:30",
  color: colors.coral,
  createdAtLabel: "今日"
};

jest.mock("react-native", () => ({
  Share: {
    share: jest.fn(() => Promise.resolve({ action: "sharedAction" }))
  }
}));

describe("activity share", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("活動サマリーから共有文面を作る", () => {
    expect(buildTerritoryShareMessage(activity)).toBe("TERRIで今日のテリトリーを確定: 5.7km / 1.23km²\n囲んだ場所が自分の色になった");
  });

  test("シェアカードPreview用dataを作る", () => {
    expect(buildTerritoryShareCardData(activity)).toEqual({
      title: "今日のテリトリー",
      createdAtLabel: "今日",
      distanceLabel: "5.7 km",
      areaLabel: "1.23 km²",
      color: colors.coral
    });
  });

  test("共有APIへ活動サマリーを渡す", async () => {
    await shareTerritorySummary(activity);

    expect(Share.share).toHaveBeenCalledWith({
      message: "TERRIで今日のテリトリーを確定: 5.7km / 1.23km²\n囲んだ場所が自分の色になった"
    });
  });
});
