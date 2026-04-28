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

  test("領土化中は録画ピルを地図上に出さない", () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<MapSurface friends={friends} live showRoute />);
    });

    expect(JSON.stringify(tree?.toJSON())).not.toContain("REC ● LIVE");
  });

  test("現在地がある場合は現在地ラベルとマーカーを表示する", () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(
        <MapSurface
          currentLocation={{ latitude: 35.66, longitude: 139.7 }}
          center={{ latitude: 35.66, longitude: 139.7 }}
          currentUser={{ initials: "ME", color: colors.mint }}
        />
      );
    });
    const output = JSON.stringify(tree?.toJSON());

    expect(output).toContain("現在地");
    expect(output).toContain("ME");
    expect(output).not.toContain("Shibuya");
  });

  test("友達の確定済み陣地を友達マーカーとは別レイヤーで表示する", () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(
        <MapSurface
          friendTerritories={[
            {
              id: "territory-sakura-final",
              friendUserId: "sakura",
              displayName: "Sakura",
              color: colors.mint,
              areaKm2: 0.42,
              calculatedAt: "2026-04-29T00:00:00.000Z",
              polygon: {
                type: "Polygon",
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
            }
          ]}
        />
      );
    });

    expect(tree?.root.findByProps({ testID: "friend-territory-territory-sakura-final" })).toBeTruthy();
  });
});
