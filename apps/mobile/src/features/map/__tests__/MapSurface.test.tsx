import renderer, { act } from "react-test-renderer";
import { MapSurface } from "@/components/map/MapSurface";
import { colors } from "@/theme/tokens";

jest.mock("react-native", () => {
  const React = require("react");
  return {
    View: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("View", props, children),
    Text: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("Text", props, children),
    StyleSheet: {
      create: (styles: unknown) => styles,
      absoluteFill: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      },
      absoluteFillObject: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      }
    }
  };
});

const friends = [
  {
    id: "sakura",
    displayName: "Sakura",
    initials: "S",
    color: colors.coral,
    totalAreaKm2: 1.5,
    isActive: true,
    updatedLabel: "今",
    latitude: 35.661,
    longitude: 139.699
  }
];

describe("MapSurface", () => {
  test("メインマップとして地名とアクティブ人数を表示する", () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<MapSurface friends={friends} activeFriendCount={1} />);
    });
    const output = JSON.stringify(tree?.toJSON());

    expect(output).toContain("map-surface");
    expect(output).toContain("Shibuya");
    expect(output).toContain("1 人が今アクティブ 🔥");
  });

  test("tracking中はREC LIVE表示へ切り替わる", () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<MapSurface friends={friends} tracking showRoute />);
    });

    expect(JSON.stringify(tree?.toJSON())).toContain("REC ● LIVE");
  });
});
