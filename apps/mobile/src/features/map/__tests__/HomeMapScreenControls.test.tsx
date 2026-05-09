import renderer, { act } from "react-test-renderer";
import { HomeMapScreen } from "@/features/map/components/HomeMapScreen";

const mockPush = jest.fn();
const mockFinalize = jest.fn();
const mockLivePreviewGeometry = {
  type: "Polygon" as const,
  coordinates: [
    [
      [139.7, 35.66],
      [139.701, 35.66],
      [139.701, 35.661],
      [139.7, 35.66]
    ]
  ]
};
let mockLiveTerritoryState: any = {
  status: "live",
  stats: { elapsed: "進行中", distanceKm: 0, previewAreaKm2: 0 },
  trackingRoute: [],
  currentLocation: { latitude: 35.66, longitude: 139.7, accuracyM: 12, recordedAt: "2026-04-28T00:00:00.000Z" }
};

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
    ScrollView: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("ScrollView", props, children),
    Text: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("Text", props, children),
    TextInput: (props: unknown) => React.createElement("TextInput", props),
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
    MapSurface: (props: unknown) => React.createElement("MapSurface", { ...(props as object), testID: "map-surface" })
  };
});

jest.mock("@/features/tracking/hooks/useLiveTerritory", () => ({
  useLiveTerritory: () => ({
    activate: jest.fn(),
    reset: jest.fn(),
    sync: jest.fn(),
    finalize: mockFinalize,
    state: mockLiveTerritoryState
  })
}));

jest.mock("@/features/friends/hooks/useFriendRequests", () => ({
  useFriendRequests: () => ({
    incomingRequests: [],
    outgoingRequests: [],
    status: "success",
    errorMessage: undefined,
    respondingFriendshipId: undefined,
    load: jest.fn(),
    respond: jest.fn()
  })
}));

jest.mock("@/lib/repositories/RepositoryProvider", () => ({
  useTerriRepository: () => ({
    getProfile: () => new Promise(() => undefined),
    getFriends: () => new Promise(() => undefined),
    getIncomingFriendRequests: () => Promise.resolve([]),
    getOutgoingFriendRequests: () => Promise.resolve([]),
    getActivities: () => new Promise(() => undefined),
    getRankings: () => new Promise(() => undefined),
    getFriendTerritories: () => new Promise(() => undefined)
  })
}));

describe("HomeMapScreen controls", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockFinalize.mockClear();
    mockLiveTerritoryState = {
      status: "live",
      stats: { elapsed: "進行中", distanceKm: 0, previewAreaKm2: 0 },
      trackingRoute: [],
      currentLocation: { latitude: 35.66, longitude: 139.7, accuracyM: 12, recordedAt: "2026-04-28T00:00:00.000Z" }
    };
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

  test("完了状態の地図はlive previewを確定陣地のfallbackにしない", () => {
    mockLiveTerritoryState = {
      status: "completed",
      stats: { elapsed: "完了", distanceKm: 1, previewAreaKm2: 0.1 },
      trackingRoute: [],
      currentLocation: { latitude: 35.66, longitude: 139.7, accuracyM: 12, recordedAt: "2026-04-28T00:00:00.000Z" },
      livePreviewGeometry: mockLivePreviewGeometry,
      finalizedResult: {
        dailyActivity: {
          id: "daily-2026-04-28",
          localDate: "2026-04-28",
          timezone: "Asia/Tokyo",
          status: "finalized",
          stats: { elapsed: "完了", distanceKm: 1, previewAreaKm2: 0.1 }
        },
        territory: {
          id: "today",
          title: "今日",
          areaKm2: 0.1,
          distanceKm: 1,
          duration: "完了",
          color: "#F07060",
          createdAtLabel: "今日"
        }
      }
    };
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<HomeMapScreen />);
    });

    const scene = tree?.root.findByProps({ testID: "map-surface" }).props.scene;

    expect(scene.layers.livePreview).toBeUndefined();
    expect(scene.layers.ownFinalTerritories).toEqual([]);
  });
});
