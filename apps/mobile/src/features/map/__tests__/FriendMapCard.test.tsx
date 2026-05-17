import renderer, { act } from "react-test-renderer";
import { FriendMapCard } from "@/features/map/components/FriendMapCard";
import { colors } from "@/theme/tokens";

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

describe("FriendMapCard", () => {
  test("友達の名前、更新状態、面積、active badgeを表示して閉じられる", () => {
    const onClose = jest.fn();
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(
        <FriendMapCard
          friend={{
            id: "sakura",
            displayName: "Sakura",
            initials: "S",
            color: colors.mint,
            totalAreaKm2: 1.2,
            isActive: true,
            updatedLabel: "2分前",
            latitude: 35.66,
            longitude: 139.7
          }}
          onClose={onClose}
        />
      );
    });

    const output = JSON.stringify(tree?.toJSON());
    expect(output).toContain("Sakura");
    expect(output).toContain("今アクティブ🔥");
    expect(output).toContain("1.2");
    expect(output).toContain("km² 獲得中");

    act(() => {
      tree?.root.findByProps({ testID: "friend-map-card-close-button" }).props.onPress();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
