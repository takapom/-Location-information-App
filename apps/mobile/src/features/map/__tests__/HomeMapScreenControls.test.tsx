import renderer, { act } from "react-test-renderer";
import { HomeMapScreen } from "@/features/map/components/HomeMapScreen";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    push: (path: string) => mockPush(path)
  }
}));

jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(() => Promise.resolve())
}));

jest.mock("react-native", () => {
  const React = require("react");
  return {
    AppState: {
      addEventListener: jest.fn(() => ({ remove: jest.fn() }))
    },
    Linking: {
      openSettings: jest.fn(() => Promise.resolve())
    },
    Platform: {
      OS: "web"
    },
    Pressable: ({ children, onPress, style, ...props }: { children?: React.ReactNode; onPress?: () => void; style?: unknown }) =>
      React.createElement("Pressable", { ...props, onPress, style: typeof style === "function" ? style({ pressed: false }) : style }, children),
    Text: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("Text", props, children),
    TouchableOpacity: ({ children, onPress, ...props }: { children?: React.ReactNode; onPress?: () => void }) =>
      React.createElement("TouchableOpacity", { ...props, onPress }, children),
    View: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("View", props, children),
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

jest.mock("@/components/map/MapSurface", () => {
  const React = require("react");
  return {
    MapSurface: () => React.createElement("MapSurface", { testID: "map-surface" })
  };
});

jest.mock("@/features/tracking/hooks/useLiveTerritory", () => ({
  useLiveTerritory: () => ({
    activate: jest.fn(),
    reset: jest.fn(),
    sync: jest.fn(),
    state: {
      status: "live",
      stats: { elapsed: "進行中", distanceKm: 0, previewAreaKm2: 0 },
      currentLocation: { latitude: 35.66, longitude: 139.7, accuracyM: 12, recordedAt: "2026-04-28T00:00:00.000Z" }
    }
  })
}));

jest.mock("@/lib/repositories/RepositoryProvider", () => ({
  useTerriRepository: () => ({
    getProfile: () => new Promise(() => undefined),
    getFriends: () => new Promise(() => undefined),
    getActivities: () => new Promise(() => undefined),
    getRankings: () => new Promise(() => undefined)
  })
}));

describe("HomeMapScreen controls", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  test("地図画面の主要ボタン導線が押下できる", () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<HomeMapScreen />);
    });

    act(() => {
      tree?.root.findByProps({ testID: "profile-button" }).props.onPress();
      tree?.root.findByProps({ testID: "history-button" }).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/profile");
    expect(tree?.root.findByProps({ testID: "history-close-button" })).toBeTruthy();

    act(() => {
      tree?.root.findByProps({ testID: "history-close-button" }).props.onPress();
      tree?.root.findByProps({ testID: "ranking-button" }).props.onPress();
    });
    expect(tree?.root.findByProps({ testID: "ranking-friends-button" })).toBeTruthy();

    act(() => {
      tree?.root.findByProps({ testID: "ranking-friends-button" }).props.onPress();
    });
    expect(tree?.root.findByProps({ testID: "friends-close-button" })).toBeTruthy();
  });
});
