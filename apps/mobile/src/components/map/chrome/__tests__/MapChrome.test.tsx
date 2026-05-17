import renderer, { act } from "react-test-renderer";
import { MapChrome } from "../MapChrome";

jest.mock("react-native", () => {
  const React = require("react");
  return {
    View: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("View", props, children),
    Text: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("Text", props, children),
    StyleSheet: {
      create: (styles: unknown) => styles
    }
  };
});

describe("MapChrome", () => {
  test("place label、active pill、privacy pill、attributionを表示する", () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(
        <MapChrome placeLabel="現在地" activeFriendCount={2} privacyLabel="友達に共有中" attribution="© OpenStreetMap contributors" />
      );
    });
    const output = JSON.stringify(tree?.toJSON());

    expect(output).toContain("現在地");
    expect(output).toContain("2 人が今アクティブ 🔥");
    expect(output).toContain("友達に共有中");
    expect(output).toContain("© OpenStreetMap contributors");
  });

  test("attributionは下部dockと重ならない高さに固定する", () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(
        <MapChrome placeLabel="Shibuya" activeFriendCount={0} privacyLabel="領土化OFF" attribution="© OpenStreetMap contributors" />
      );
    });

    const attribution = tree?.root.findByProps({ testID: "map-attribution" });
    expect(attribution?.props.style.bottom).toBeGreaterThanOrEqual(88);
  });
});
