import React from "react";
import renderer, { act } from "react-test-renderer";
import { MapSurface } from "@/components/map/MapSurface.native";
import { buildPlaceholderLivePreviewFeature } from "@/components/map/scene/mapSceneDefaults";
import { colors } from "@/theme/tokens";

const mockAnimateToRegion = jest.fn();

jest.mock("react-native", () => {
  const React = require("react");
  return {
    View: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("View", props, children),
    Text: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("Text", props, children),
    StyleSheet: {
      create: (styles: unknown) => styles,
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

jest.mock("react-native-maps", () => {
  const React = require("react");
  const MapView = React.forwardRef(({ children, ...props }: { children?: React.ReactNode }, ref: unknown) => {
    React.useImperativeHandle(ref, () => ({ animateToRegion: mockAnimateToRegion }));
    return React.createElement("MapView", props, children);
  });
  return {
    __esModule: true,
    default: MapView,
    Marker: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("Marker", props, children),
    Polygon: (props: Record<string, unknown>) => React.createElement("Polygon", props),
    Polyline: (props: Record<string, unknown>) => React.createElement("Polyline", props)
  };
});

describe("MapSurface.native", () => {
  beforeEach(() => {
    mockAnimateToRegion.mockClear();
  });

  test("Release実機クラッシュ回避のためMapLibreを使わずiOS標準地図を描画する", () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<MapSurface center={{ latitude: 35.66, longitude: 139.7 }} />);
    });

    const mapView = tree?.root.findAll((node) => String(node.type) === "MapView")[0];

    expect(tree?.root.findAll((node) => String(node.type) === "Map")).toHaveLength(0);
    expect(tree?.root.findAll((node) => node.props.testID === "map-surface").length).toBeGreaterThanOrEqual(1);
    expect(mapView?.props.testID).toBe("native-standard-map");
    expect(mapView?.props.mapType).toBe("standard");
    expect(mapView?.props.scrollEnabled).toBe(true);
    expect(mapView?.props.zoomEnabled).toBe(true);
  });

  test("friend territoryとfriend markerを標準地図へ反映する", () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(
        <MapSurface
          scene={{
            viewport: {
              center: { latitude: 35.66, longitude: 139.7 },
              currentLocation: { latitude: 35.66, longitude: 139.7 },
              followMode: "autoUntilUserMoves"
            },
            user: { marker: { initials: "ME", color: colors.coral } },
            layers: {
              ownFinalTerritories: [],
              friendFinalTerritories: [
                {
                  id: "territory-sakura-final",
                  userId: "sakura",
                  displayName: "Sakura",
                  color: colors.mint,
                  areaKm2: 0.42,
                  geometry: {
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
              ],
              livePreview: undefined,
              trackingRoute: undefined,
              friends: [
                {
                  id: "sakura",
                  displayName: "Sakura",
                  initials: "S",
                  color: colors.mint,
                  totalAreaKm2: 1.2,
                  isActive: true,
                  updatedLabel: "いま",
                  latitude: 35.6605,
                  longitude: 139.7005
                }
              ]
            },
            chrome: {
              placeLabel: "現在地",
              activeFriendCount: 1,
              privacyLabel: "FRIENDS ONLY",
              attribution: "© OpenStreetMap contributors"
            }
          }}
        />
      );
    });

    const polygons = tree?.root.findAll((node) => String(node.type) === "Polygon") ?? [];
    const friendMarker = tree?.root.findAll((node) => node.props.testID === "friend-marker-sakura") ?? [];

    expect(polygons).toHaveLength(1);
    expect(friendMarker.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(tree?.toJSON())).toContain("S");
  });

  test("移動前はデモ用の陣地ポリゴンを表示しない", () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(
        <MapSurface
          scene={{
            viewport: {
              center: { latitude: 35.66, longitude: 139.7 },
              currentLocation: { latitude: 35.66, longitude: 139.7 },
              followMode: "autoUntilUserMoves"
            },
            user: { marker: { initials: "ME", color: colors.coral } },
            layers: {
              ownFinalTerritories: [],
              friendFinalTerritories: [],
              livePreview: undefined,
              trackingRoute: undefined,
              friends: []
            },
            chrome: {
              placeLabel: "現在地",
              activeFriendCount: 0,
              privacyLabel: "FRIENDS ONLY",
              attribution: "© OpenStreetMap contributors"
            }
          }}
        />
      );
    });

    expect(tree?.root.findAll((node) => String(node.type) === "Polygon")).toHaveLength(0);
  });

  test("MapChromeとMapAttributionが表示される", () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<MapSurface currentLocation={{ latitude: 35.66, longitude: 139.7 }} activeFriendCount={2} />);
    });
    const output = JSON.stringify(tree?.toJSON());

    expect(output).toContain("現在地");
    expect(output).toContain("2 人が今アクティブ 🔥");
    expect(output).toContain("FRIENDS ONLY");
    expect(output).toContain("© OpenStreetMap contributors");
  });

  test("現在地取得後は渋谷fallbackから現在地へ地図カメラを移動する", () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<MapSurface />);
    });

    act(() => {
      tree?.update(<MapSurface currentLocation={{ latitude: 35.6812, longitude: 139.7671 }} />);
    });

    expect(mockAnimateToRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 35.6812,
        longitude: 139.7671
      }),
      450
    );
  });

  test("live preview polygonは将来MapLibreへ戻しても不正geometryにならないよう閉じる", () => {
    const feature = buildPlaceholderLivePreviewFeature({ latitude: 35.66, longitude: 139.7 }, colors.coral);
    if (feature.geometry.type !== "Polygon") throw new Error("preview feature must be polygon");

    const ring = feature.geometry.coordinates[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(ring.length).toBeGreaterThanOrEqual(4);
  });
});
