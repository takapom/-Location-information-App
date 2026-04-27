import { styles } from "@/features/map/components/HomeMapScreen.styles";

jest.mock("react-native", () => ({
  StyleSheet: {
    create: (styles: unknown) => styles
  }
}));

describe("HomeMapScreen layout", () => {
  test("S04の地図可視領域を優先するため下部UIをコンパクトに保つ", () => {
    expect(styles.statsCard.height).toBeLessThanOrEqual(64);
    expect(styles.startDock.height).toBeLessThanOrEqual(70);
    expect(styles.startButton.width).toBeLessThanOrEqual(88);
    expect(styles.syncButton.height).toBeLessThanOrEqual(36);
  });
});
