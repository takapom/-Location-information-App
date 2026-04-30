import renderer, { act } from "react-test-renderer";
import { colors } from "@/theme/tokens";
import { FriendsModal } from "@/features/map/components/FriendsModal";
import { HistorySheet } from "@/features/map/components/HistorySheet";
import { LiveTerritoryPanel } from "@/features/map/components/LiveTerritoryPanel";
import { getWeeklyDeltaLabel, getWeeklyDeltaTone, RankingSheet } from "@/features/map/components/RankingSheet";
import { StartDock } from "@/features/map/components/StartDock";
import { RepositoryProvider } from "@/lib/repositories/RepositoryProvider";
import { createMockTerriRepository } from "@/lib/repositories/mockTerriRepository";

const mockPush = jest.fn();
const mockSetStringAsync = jest.fn<Promise<void>, [string]>(() => Promise.resolve());

jest.mock("expo-router", () => ({
  router: {
    push: (path: string) => mockPush(path)
  }
}));

jest.mock("expo-clipboard", () => ({
  setStringAsync: (value: string) => mockSetStringAsync(value)
}));

jest.mock("react-native", () => {
  const React = require("react");
  return {
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

const activity = {
  id: "today",
  title: "今日",
  areaKm2: 1.2,
  distanceKm: 3.4,
  duration: "進行中",
  color: colors.coral,
  createdAtLabel: "今日"
};

const ranking = {
  id: "me",
  rank: 1,
  name: "ユーザー",
  initials: "U",
  areaKm2: 2.3,
  deltaKm2: 0.4,
  color: colors.coral,
  isCurrentUser: true
};

const friend = {
  id: "sakura",
  displayName: "Sakura",
  initials: "S",
  color: colors.mint,
  totalAreaKm2: 1.5,
  isActive: true,
  updatedAt: "2026-04-28T00:00:00.000Z",
  locationSharingEnabled: true,
  position: { latitude: 35.66, longitude: 139.7 }
};

describe("map controls", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSetStringAsync.mockClear();
  });

  test("下部ドックの履歴・ランキングボタンが押下できる", () => {
    const onHistory = jest.fn();
    const onRanking = jest.fn();
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<StartDock captureLabel="領土化ON" captureStatus="live" onHistory={onHistory} onRanking={onRanking} />);
    });

    act(() => {
      tree?.root.findByProps({ testID: "history-button" }).props.onPress();
      tree?.root.findByProps({ testID: "ranking-button" }).props.onPress();
    });

    expect(onHistory).toHaveBeenCalledTimes(1);
    expect(onRanking).toHaveBeenCalledTimes(1);
  });

  test("位置情報案内と同期ボタンが押下できる", () => {
    const onRequestPermission = jest.fn();
    const onSync = jest.fn();
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<LiveTerritoryPanel stats={{ elapsed: "確認中", distanceKm: 0, previewAreaKm2: 0 }} status="permissionDenied" onRequestPermission={onRequestPermission} onSync={onSync} />);
    });

    act(() => {
      tree?.root.findByProps({ testID: "location-settings-button" }).props.onPress();
      tree?.root.findByProps({ testID: "sync-territory-button" }).props.onPress();
    });

    expect(onRequestPermission).toHaveBeenCalledTimes(1);
    expect(onSync).toHaveBeenCalledTimes(1);
  });

  test("履歴シートの閉じる・活動カードが押下できる", () => {
    const onClose = jest.fn();
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<HistorySheet activities={[activity]} onClose={onClose} />);
    });

    act(() => {
      tree?.root.findByProps({ testID: "history-close-button" }).props.onPress();
      tree?.root.findByProps({ testID: "activity-card-today" }).props.onPress();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/activity/today");
  });

  test("ランキングから友達画面を開ける", () => {
    const onFriends = jest.fn();
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<RankingSheet rankings={[ranking]} onFriends={onFriends} />);
    });

    act(() => {
      tree?.root.findByProps({ testID: "ranking-friends-button" }).props.onPress();
    });

    expect(onFriends).toHaveBeenCalledTimes(1);
  });

  test("ランキング前週比は正負ゼロを実値で表示する", () => {
    expect(getWeeklyDeltaLabel(0.4)).toBe("先週比+0.4");
    expect(getWeeklyDeltaLabel(-0.2)).toBe("先週比-0.2");
    expect(getWeeklyDeltaLabel(0)).toBe("先週比±0.0");
    expect(getWeeklyDeltaTone(0.4)).toBe("mint");
    expect(getWeeklyDeltaTone(-0.2)).toBe("coral");
    expect(getWeeklyDeltaTone(0)).toBe("neutral");
  });

  test("友達モーダルの閉じる・コピー・検索ボタンが押下できる", async () => {
    const onClose = jest.fn();
    let tree: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(<FriendsModal friends={[friend]} onClose={onClose} />);
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    act(() => {
      tree?.root.findByProps({ testID: "friends-close-button" }).props.onPress();
      tree?.root.findByProps({ testID: "invite-copy-button" }).props.onPress();
      tree?.root.findByProps({ testID: "friends-add-button" }).props.onPress();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockSetStringAsync).toHaveBeenCalledWith("https://app.link/share...xyz");
  });

  test("友達ID検索から友達申請を送れる", async () => {
    const repository = createMockTerriRepository();
    let tree: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(
        <RepositoryProvider repository={repository}>
          <FriendsModal friends={[friend]} onClose={jest.fn()} />
        </RepositoryProvider>
      );
    });

    await act(async () => {
      tree?.root.findByProps({ testID: "friends-search-input" }).props.onChangeText("RI");
    });

    await act(async () => {
      tree?.root.findByProps({ testID: "friends-search-button" }).props.onPress();
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const requestButton = tree?.root.findByProps({ testID: "friend-request-RIKU2026" });
    expect(requestButton).toBeTruthy();

    await act(async () => {
      requestButton?.props.onPress();
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(tree?.root.findByProps({ testID: "friend-request-label-RIKU2026" }).props.children).toBe("申請済み");
  });

  test("届いた友達申請を承認すると友達一覧の更新を通知する", async () => {
    const repository = createMockTerriRepository();
    const onFriendsChange = jest.fn();
    let tree: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(
        <RepositoryProvider repository={repository}>
          <FriendsModal friends={[friend]} onFriendsChange={onFriendsChange} onClose={jest.fn()} />
        </RepositoryProvider>
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    await act(async () => {
      tree?.root.findByProps({ testID: "friend-request-accept-friendship-yui" }).props.onPress();
      await new Promise((resolve) => setTimeout(resolve, 220));
    });

    expect(onFriendsChange).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: "yui" }), expect.objectContaining({ id: "sakura" })]));
  });
});
