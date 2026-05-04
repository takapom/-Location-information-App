import renderer, { act } from "react-test-renderer";
import { Share } from "react-native";
import { ActivityDetailScreen } from "@/features/activities/components/ActivityDetailScreen";
import { colors } from "@/theme/tokens";
import { RepositoryProvider } from "@/lib/repositories/RepositoryProvider";
import { createMockTerriRepository } from "@/lib/repositories/mockTerriRepository";

const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    back: () => mockBack()
  },
  useLocalSearchParams: () => ({ id: "today" })
}));

jest.mock("@/components/map/MapSurface", () => {
  const React = require("react");
  return {
    MapSurface: () => React.createElement("MapSurface", { testID: "activity-map-surface" })
  };
});

jest.mock("react-native", () => {
  const React = require("react");
  return {
    Pressable: ({ children, disabled, onPress, style, ...props }: { children?: React.ReactNode; disabled?: boolean; onPress?: () => void; style?: unknown }) =>
      React.createElement("Pressable", { ...props, disabled, onPress, style: typeof style === "function" ? style({ pressed: false }) : style }, children),
    Share: {
      share: jest.fn(() => Promise.resolve({ action: "sharedAction" }))
    },
    StyleSheet: {
      create: (styles: unknown) => styles
    },
    Text: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("Text", props, children),
    TouchableOpacity: ({ children, disabled, onPress, ...props }: { children?: React.ReactNode; disabled?: boolean; onPress?: () => void }) =>
      React.createElement("TouchableOpacity", { ...props, disabled, onPress }, children),
    View: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("View", props, children)
  };
});

describe("ActivityDetailScreen", () => {
  beforeEach(() => {
    mockBack.mockClear();
    jest.clearAllMocks();
    (Share.share as jest.Mock).mockResolvedValue({ action: "sharedAction" });
  });

  test("戻るボタンとシェアボタンが実際の処理へ接続される", async () => {
    const repository = createMockTerriRepository();
    repository.getActivity = jest.fn(() =>
      Promise.resolve({
        id: "today",
        title: "今日",
        areaKm2: 2.3,
        distanceKm: 5.2,
        duration: "42:30",
        color: colors.coral,
        createdAtLabel: "今日"
      })
    );
    let tree: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(
        <RepositoryProvider repository={repository}>
          <ActivityDetailScreen />
        </RepositoryProvider>
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    act(() => {
      tree?.root.findByProps({ testID: "activity-back-button" }).props.onPress();
    });
    expect(mockBack).toHaveBeenCalledTimes(1);

    await act(async () => {
      tree?.root.findByProps({ testID: "activity-share-icon-button" }).props.onPress();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(Share.share).toHaveBeenCalledWith({
      message: "TERRIで今日のテリトリーを広げました: 5.2km / 2.30km2"
    });

    await act(async () => {
      tree?.root.findByProps({ testID: "activity-share-button" }).props.onPress();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(Share.share).toHaveBeenCalledTimes(2);
  });

  test("シェア失敗時は未処理Promiseにせず画面へエラーを表示する", async () => {
    (Share.share as jest.Mock).mockRejectedValueOnce(new Error("共有できませんでした"));
    const repository = createMockTerriRepository();
    repository.getActivity = jest.fn(() =>
      Promise.resolve({
        id: "today",
        title: "今日",
        areaKm2: 2.3,
        distanceKm: 5.2,
        duration: "42:30",
        color: colors.coral,
        createdAtLabel: "今日"
      })
    );
    let tree: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(
        <RepositoryProvider repository={repository}>
          <ActivityDetailScreen />
        </RepositoryProvider>
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      tree?.root.findByProps({ testID: "activity-share-button" }).props.onPress();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(tree?.root.findByProps({ testID: "activity-share-error" }).props.children).toBe("共有できませんでした");
  });
});
