import renderer, { act } from "react-test-renderer";
import { colors } from "@/theme/tokens";
import { CompleteSheet } from "@/features/map/components/CompleteSheet";
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
    Share: {
      share: jest.fn(() => Promise.resolve({ action: "sharedAction" }))
    },
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
    const { Share } = require("react-native");
    Share.share.mockClear();
    Share.share.mockResolvedValue({ action: "sharedAction" });
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

  test("位置情報案内を押下でき、停止系状態では同期ボタンが無効になる", () => {
    const onRequestPermission = jest.fn();
    const onSync = jest.fn();
    const onFinalize = jest.fn();
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<LiveTerritoryPanel stats={{ elapsed: "確認中", distanceKm: 0, previewAreaKm2: 0 }} status="permissionDenied" onRequestPermission={onRequestPermission} onSync={onSync} onFinalize={onFinalize} />);
    });

    act(() => {
      tree?.root.findByProps({ testID: "location-settings-button" }).props.onPress();
    });

    expect(onRequestPermission).toHaveBeenCalledTimes(1);
    expect(tree?.root.findByProps({ testID: "sync-territory-button" }).props.disabled).toBe(true);
    expect(onSync).not.toHaveBeenCalled();
  });

  test("領土化中は同期ボタンを押下できる", () => {
    const onSync = jest.fn();
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<LiveTerritoryPanel stats={{ elapsed: "進行中", distanceKm: 0.3, previewAreaKm2: 0.01 }} status="live" onRequestPermission={jest.fn()} onSync={onSync} onFinalize={jest.fn()} />);
    });

    expect(tree?.root.findByProps({ testID: "sync-territory-button" }).props.disabled).toBe(false);
    act(() => {
      tree?.root.findByProps({ testID: "sync-territory-button" }).props.onPress();
    });

    expect(onSync).toHaveBeenCalledTimes(1);
  });

  test("領土化中はSTOPで確定処理を呼べる", () => {
    const onFinalize = jest.fn();
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<LiveTerritoryPanel stats={{ elapsed: "進行中", distanceKm: 0.3, previewAreaKm2: 0.01 }} status="live" onRequestPermission={jest.fn()} onSync={jest.fn()} onFinalize={onFinalize} />);
    });

    act(() => {
      tree?.root.findByProps({ testID: "finalize-territory-button" }).props.onPress();
    });

    expect(onFinalize).toHaveBeenCalledTimes(1);
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
    const onClose = jest.fn();
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<RankingSheet rankings={[ranking]} onClose={onClose} onFriends={onFriends} />);
    });

    act(() => {
      tree?.root.findByProps({ testID: "ranking-friends-button" }).props.onPress();
      tree?.root.findByProps({ testID: "ranking-close-button" }).props.onPress();
    });

    expect(onFriends).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(tree?.root.findByProps({ testID: "ranking-scroll-view" })).toBeTruthy();
  });

  test("ランキングシートは下に下げて閉じられる", () => {
    const onClose = jest.fn();
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<RankingSheet rankings={[ranking]} onClose={onClose} onFriends={jest.fn()} />);
    });

    const handle = tree?.root.findByProps({ testID: "bottom-sheet-drag-handle" });
    act(() => {
      handle?.props.onResponderGrant({ nativeEvent: { pageY: 10 } });
      handle?.props.onResponderRelease({ nativeEvent: { pageY: 90 } });
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("完了シートのシェアと閉じるボタンが押下できる", async () => {
    const { Share } = require("react-native");
    const onClose = jest.fn();
    let tree: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(
        <CompleteSheet
          result={{
            dailyActivity: {
              id: "daily-today",
              localDate: "2026-05-04",
              timezone: "Asia/Tokyo",
              status: "open",
              stats: { elapsed: "進行中", distanceKm: 5.2, previewAreaKm2: 2.3 }
            },
            territory: activity
          }}
          onClose={onClose}
        />
      );
    });

    await act(async () => {
      tree?.root.findByProps({ testID: "complete-share-button" }).props.onPress();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(Share.share).toHaveBeenCalledWith({
      message: "TERRIで今日のテリトリーを広げました: 3.4km / 1.20km2"
    });

    act(() => {
      tree?.root.findByProps({ testID: "complete-close-button" }).props.onPress();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("完了シートのシェア失敗時はエラーを表示する", async () => {
    const { Share } = require("react-native");
    Share.share.mockRejectedValueOnce(new Error("共有できませんでした"));
    let tree: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(
        <CompleteSheet
          result={{
            dailyActivity: {
              id: "daily-today",
              localDate: "2026-05-04",
              timezone: "Asia/Tokyo",
              status: "open",
              stats: { elapsed: "進行中", distanceKm: 5.2, previewAreaKm2: 2.3 }
            },
            territory: activity
          }}
          onClose={jest.fn()}
        />
      );
    });

    await act(async () => {
      tree?.root.findByProps({ testID: "complete-share-button" }).props.onPress();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(tree?.root.findByProps({ testID: "complete-share-error" }).props.children).toBe("共有できませんでした");
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
    expect(tree?.root.findByProps({ testID: "friends-scroll-view" })).toBeTruthy();
  });

  test("友達モーダルは下に下げて閉じられ、友達一覧を全件表示する", async () => {
    const onClose = jest.fn();
    const friends = [
      friend,
      { ...friend, id: "riku", displayName: "Riku", initials: "R", color: colors.coral },
      { ...friend, id: "yui", displayName: "Yui", initials: "Y", color: colors.lavender },
      { ...friend, id: "mio", displayName: "Mio", initials: "M", color: colors.sky }
    ];
    let tree: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(<FriendsModal friends={friends} onClose={onClose} />);
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const output = JSON.stringify(tree?.toJSON());
    expect(output).toContain("Mio");

    const handle = tree?.root.findByProps({ testID: "friends-drag-close-handle" });
    act(() => {
      handle?.props.onResponderGrant({ nativeEvent: { pageY: 20 } });
      handle?.props.onResponderRelease({ nativeEvent: { pageY: 100 } });
    });

    expect(onClose).toHaveBeenCalledTimes(1);
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
