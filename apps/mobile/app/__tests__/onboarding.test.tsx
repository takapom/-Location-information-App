import renderer, { act } from "react-test-renderer";
import OnboardingScreen from "../onboarding";

jest.mock("expo-router", () => ({
  router: {
    replace: jest.fn()
  }
}));

jest.mock("react-native", () => {
  const React = require("react");
  return {
    Text: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("Text", props, children),
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
    PrimaryButton: ({ children, onPress }: { children?: React.ReactNode; onPress?: () => void }) =>
      React.createElement("PrimaryButton", { onPress }, children)
  };
});

describe("OnboardingScreen", () => {
  test("囲むとテリトリーになる初回説明を表示する", () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<OnboardingScreen />);
    });

    const output = JSON.stringify(tree?.toJSON());
    expect(output).toContain("ぐるっと囲んで");
    expect(output).toContain("線を引いて、囲めた場所が自分の色になる");
    expect(output).toContain("歩くと線が伸びる");
    expect(output).toContain("戻って囲む");
    expect(output).toContain("内側がテリトリーになる");
  });
});
