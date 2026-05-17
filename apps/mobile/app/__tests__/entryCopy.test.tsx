import renderer, { act } from "react-test-renderer";
import SplashScreen from "../index";
import LoginScreen from "../login";

let mockAuth = {
  enabled: false,
  loading: false,
  session: undefined,
  errorMessage: undefined,
  signInWithPassword: jest.fn(),
  signUpWithPassword: jest.fn()
};

jest.mock("expo-router", () => ({
  router: {
    replace: jest.fn()
  }
}));

jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => mockAuth
}));

jest.mock("react-native", () => {
  const React = require("react");
  return {
    Text: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("Text", props, children),
    TextInput: (props: unknown) => React.createElement("TextInput", props),
    TouchableOpacity: ({ children, onPress, ...props }: { children?: React.ReactNode; onPress?: () => void }) =>
      React.createElement("TouchableOpacity", { ...props, onPress }, children),
    View: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("View", props, children),
    StyleSheet: {
      create: (styles: unknown) => styles
    }
  };
});

jest.mock("@/components/ui/Backdrop", () => {
  const React = require("react");
  return {
    SoftBackdrop: () => React.createElement("SoftBackdrop")
  };
});

jest.mock("@/components/ui/PrimaryButton", () => {
  const React = require("react");
  return {
    PrimaryButton: ({ children, disabled, onPress, variant }: { children?: React.ReactNode; disabled?: boolean; onPress?: () => void; variant?: string }) =>
      React.createElement("PrimaryButton", { disabled, onPress, variant }, children)
  };
});

jest.mock("@/components/ui/TerriLogo", () => {
  const React = require("react");
  return {
    TerriLogo: (props: unknown) => React.createElement("TerriLogo", props)
  };
});

describe("entry screen copy", () => {
  beforeEach(() => {
    mockAuth = {
      enabled: false,
      loading: false,
      session: undefined,
      errorMessage: undefined,
      signInWithPassword: jest.fn(),
      signUpWithPassword: jest.fn()
    };
  });

  test("Splashは囲むとテリトリーになるコピーを表示する", () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<SplashScreen />);
    });

    const output = JSON.stringify(tree?.toJSON());
    expect(output).toContain("線で囲めた場所が、自分のテリトリーになる");
    expect(output).not.toContain("歩いた分だけ、世界が自分のものになる");

    act(() => {
      tree?.unmount();
    });
  });

  test("Loginは囲むとテリトリーになるコピーを表示する", () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<LoginScreen />);
    });

    const output = JSON.stringify(tree?.toJSON());
    expect(output).toContain("線で囲めた場所が、自分のテリトリーになる");
    expect(output).not.toContain("歩いた分だけ、世界が自分のものになる");
  });
});
