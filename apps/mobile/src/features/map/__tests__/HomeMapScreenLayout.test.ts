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
    expect(styles.captureStatus.height).toBeLessThanOrEqual(40);
    expect(styles.syncButton.height).toBeLessThanOrEqual(36);
  });

  test("友達モーダルは地図レイヤーより前面に出す", () => {
    expect(styles.modal.zIndex).toBeGreaterThan(1000);
    expect(styles.modalClose.zIndex).toBeGreaterThan(styles.modal.zIndex);
  });

  test("操作UIは地図レイヤーより前面でタップを受け取る", () => {
    expect(styles.mapLayer.zIndex).toBe(0);
    expect(styles.profileButton.zIndex).toBeGreaterThan(styles.mapLayer.zIndex);
    expect(styles.livePanel.zIndex).toBeGreaterThan(styles.mapLayer.zIndex);
    expect(styles.startDock.zIndex).toBeGreaterThan(styles.mapLayer.zIndex);
  });
});
