import { useRef } from "react";
import { StyleSheet, View, type GestureResponderEvent } from "react-native";
import type { PropsWithChildren } from "react";
import { colors, shadow } from "@/theme/tokens";

const CLOSE_DRAG_DISTANCE = 64;

export function BottomSheet({ children, height = "58%", onClose }: PropsWithChildren<{ height?: `${number}%`; onClose?: () => void }>) {
  const dragStartYRef = useRef<number | undefined>(undefined);

  const startDrag = (event: GestureResponderEvent) => {
    dragStartYRef.current = event.nativeEvent.pageY;
  };

  const releaseDrag = (event: GestureResponderEvent) => {
    const startY = dragStartYRef.current;
    dragStartYRef.current = undefined;
    if (startY === undefined) return;
    if (event.nativeEvent.pageY - startY >= CLOSE_DRAG_DISTANCE) {
      onClose?.();
    }
  };

  return (
    <View style={[styles.sheet, { height }]}>
      <View
        accessibilityLabel="シートを下に下げて閉じる"
        accessibilityRole={onClose ? "button" : undefined}
        onResponderGrant={startDrag}
        onResponderRelease={releaseDrag}
        onStartShouldSetResponder={() => Boolean(onClose)}
        style={styles.handleHitArea}
        testID="bottom-sheet-drag-handle"
      >
        <View style={styles.handle} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1800,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 28,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    backgroundColor: colors.surface,
    ...shadow,
    elevation: 18
  },
  handleHitArea: {
    position: "absolute",
    top: 0,
    alignSelf: "center",
    width: 120,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2
  },
  handle: {
    width: 54,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C9C5C8"
  }
});
