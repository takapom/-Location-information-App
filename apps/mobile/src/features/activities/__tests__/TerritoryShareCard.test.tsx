import renderer, { act } from "react-test-renderer";
import { TerritoryShareCard } from "@/features/activities/components/TerritoryShareCard";
import { colors } from "@/theme/tokens";

jest.mock("react-native", () => {
  const React = require("react");
  return {
    Text: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("Text", props, children),
    View: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("View", props, children),
    StyleSheet: {
      create: (styles: unknown) => styles
    }
  };
});

describe("TerritoryShareCard", () => {
  test("共有Previewに日付、距離、面積を表示する", () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(
        <TerritoryShareCard
          data={{
            title: "今日のテリトリー",
            createdAtLabel: "今日",
            distanceLabel: "5.7 km",
            areaLabel: "1.23 km²",
            color: colors.coral
          }}
        />
      );
    });

    const output = JSON.stringify(tree?.toJSON());
    expect(output).toContain("今日のテリトリー");
    expect(output).toContain("囲んだ場所が自分の色になった");
    expect(output).toContain("5.7 km");
    expect(output).toContain("1.23 km²");
  });
});
