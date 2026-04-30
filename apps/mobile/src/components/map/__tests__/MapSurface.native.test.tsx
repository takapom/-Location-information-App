import React from "react";
import renderer, { act } from "react-test-renderer";
import { MapSurface } from "@/components/map/MapSurface.native";
import { MAP_INITIAL_ZOOM, MAP_MAX_ZOOM, MAP_MIN_ZOOM } from "@/components/map/mapCamera";

const mockEaseTo = jest.fn();

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

jest.mock("@maplibre/maplibre-react-native", () => {
  const React = require("react");
  return {
    Camera: React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
      React.useImperativeHandle(ref, () => ({
        easeTo: mockEaseTo,
        jumpTo: jest.fn(),
        flyTo: jest.fn(),
        fitBounds: jest.fn(),
        zoomTo: jest.fn(),
        setStop: jest.fn()
      }));
      return React.createElement("Camera", props);
    }),
    GeoJSONSource: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("GeoJSONSource", props, children),
    Layer: (props: Record<string, unknown>) => React.createElement("Layer", props),
    Map: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("Map", props, children),
    Marker: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("Marker", props, children)
  };
});

describe("MapSurface.native", () => {
  beforeEach(() => {
    mockEaseTo.mockClear();
  });

  test("Cameraは初期ズームだけを渡し、ユーザーのズームアウトを固定値で戻さない", () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<MapSurface center={{ latitude: 35.66, longitude: 139.7 }} />);
    });

    const camera = tree?.root.findAll((node) => String(node.type) === "Camera")[0];

    expect(camera?.props.initialViewState).toEqual({
      center: [139.7, 35.66],
      zoom: MAP_INITIAL_ZOOM
    });
    expect(camera?.props.zoom).toBeUndefined();
    expect(camera?.props.minZoom).toBe(MAP_MIN_ZOOM);
    expect(camera?.props.maxZoom).toBe(MAP_MAX_ZOOM);
  });

  test("ユーザーが地図を操作した後は位置更新でカメラを自動追従しない", () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<MapSurface center={{ latitude: 35.66, longitude: 139.7 }} />);
    });

    act(() => {
      tree?.update(<MapSurface center={{ latitude: 35.661, longitude: 139.701 }} />);
    });

    expect(mockEaseTo).toHaveBeenCalledWith({
      center: [139.701, 35.661],
      duration: 450
    });

    const map = tree?.root.findAll((node) => String(node.type) === "Map")[0];
    act(() => {
      map?.props.onRegionWillChange({ nativeEvent: { userInteraction: true } });
    });

    mockEaseTo.mockClear();

    act(() => {
      tree?.update(<MapSurface center={{ latitude: 35.662, longitude: 139.702 }} />);
    });

    expect(mockEaseTo).not.toHaveBeenCalled();
  });
});
