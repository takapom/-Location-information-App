import renderer, { act } from "react-test-renderer";
import { ProfileScreen } from "@/features/profile/components/ProfileScreen";
import { RepositoryProvider } from "@/lib/repositories/RepositoryProvider";
import type { TerriRepository } from "@/lib/repositories/terriRepository";

const mockReplace = jest.fn();
const mockUseAuth = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    replace: (path: string) => mockReplace(path)
  },
  useLocalSearchParams: () => ({})
}));

jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth()
}));

jest.mock("react-native", () => {
  const React = require("react");
  return {
    StyleSheet: {
      create: (styles: unknown) => styles
    },
    Switch: (props: unknown) => React.createElement("Switch", props),
    Text: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("Text", props, children),
    TouchableOpacity: ({ children, onPress, ...props }: { children?: React.ReactNode; onPress?: () => void }) =>
      React.createElement("TouchableOpacity", { ...props, onPress }, children),
    View: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("View", props, children)
  };
});

function createRepository(overrides: Partial<TerriRepository>): TerriRepository {
  return {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    updateTerritoryColor: jest.fn(),
    getFriends: jest.fn(),
    searchFriendsByCode: jest.fn(),
    getIncomingFriendRequests: jest.fn(),
    getOutgoingFriendRequests: jest.fn(),
    requestFriendByCode: jest.fn(),
    respondFriendRequest: jest.fn(),
    getActivities: jest.fn(),
    getActivity: jest.fn(),
    getRankings: jest.fn(),
    getFriendTerritories: jest.fn(),
    ensureDailyActivity: jest.fn(),
    appendLocationPoint: jest.fn(),
    syncDailyActivity: jest.fn(),
    ...overrides
  } as TerriRepository;
}

describe("ProfileScreen", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockUseAuth.mockReset();
  });

  test("Supabase有効かつ未ログインならプロフィール取得前にログインへ戻す", () => {
    const getProfile = jest.fn();
    const repository = createRepository({ getProfile });
    mockUseAuth.mockReturnValue({
      enabled: true,
      loading: false,
      session: null,
      signOut: jest.fn()
    });

    act(() => {
      renderer.create(
        <RepositoryProvider repository={repository}>
          <ProfileScreen />
        </RepositoryProvider>
      );
    });

    expect(getProfile).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  test("プロフィール取得失敗時はredboxではなくエラー表示に落とす", async () => {
    const repository = createRepository({
      getProfile: jest.fn().mockRejectedValue(new Error("Auth session missing!"))
    });
    mockUseAuth.mockReturnValue({
      enabled: true,
      loading: false,
      session: { user: { id: "user-1" } },
      signOut: jest.fn()
    });

    let tree: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(
        <RepositoryProvider repository={repository}>
          <ProfileScreen />
        </RepositoryProvider>
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(JSON.stringify(tree?.toJSON())).toContain("Auth session missing!");
  });
});
