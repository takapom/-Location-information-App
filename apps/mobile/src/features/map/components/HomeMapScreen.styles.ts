import { StyleSheet } from "react-native";
import { colors, font, shadow } from "@/theme/tokens";

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.mapBase
  },
  mapLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0
  },
  profileButton: {
    position: "absolute",
    right: 22,
    top: 82,
    zIndex: 1200,
    elevation: 12
  },
  errorBanner: {
    position: "absolute",
    left: 24,
    right: 96,
    top: 88,
    minHeight: 46,
    borderRadius: 23,
    backgroundColor: colors.surface,
    color: colors.coral,
    fontSize: 15,
    fontWeight: font.heavy,
    paddingHorizontal: 18,
    paddingVertical: 12,
    zIndex: 1300,
    ...shadow,
    elevation: 13
  },
  liveErrorBanner: {
    position: "absolute",
    left: 24,
    right: 24,
    top: 142,
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    color: colors.coral,
    fontSize: 14,
    fontWeight: font.heavy,
    paddingHorizontal: 18,
    paddingVertical: 11,
    zIndex: 1300,
    ...shadow,
    elevation: 13
  },
  startDock: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 24,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    zIndex: 1200,
    ...shadow,
    elevation: 12
  },
  dockSide: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  dockIcon: {
    fontSize: 25,
    color: colors.muted
  },
  captureStatus: {
    flex: 1,
    minWidth: 0,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F0F1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    gap: 7
  },
  captureStatusDot: {
    fontSize: 14,
    lineHeight: 14,
    fontWeight: font.heavy
  },
  captureStatusText: {
    flexShrink: 1,
    color: colors.ink,
    fontSize: 13,
    fontWeight: font.heavy
  },
  trackingWrap: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 54
  },
  livePanel: {
    position: "absolute",
    left: 34,
    right: 34,
    bottom: 92,
    zIndex: 1200,
    elevation: 12
  },
  locationPrompt: {
    minHeight: 64,
    borderRadius: 22,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    ...shadow
  },
  locationPromptTextWrap: {
    flex: 1,
    paddingRight: 10
  },
  locationPromptTitle: {
    fontSize: 15,
    fontWeight: font.heavy,
    color: colors.ink
  },
  locationPromptBody: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: font.bold,
    color: colors.muted
  },
  locationPromptButton: {
    height: 34,
    minWidth: 58,
    borderRadius: 17,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  locationPromptButtonText: {
    fontSize: 13,
    fontWeight: font.heavy,
    color: colors.surface
  },
  statsCard: {
    height: 62,
    borderRadius: 22,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingLeft: 12,
    paddingRight: 10,
    ...shadow
  },
  stat: {
    flex: 1,
    alignItems: "center"
  },
  statValue: {
    fontSize: 17,
    fontWeight: font.heavy,
    color: colors.ink
  },
  statLabel: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: font.bold,
    color: colors.muted
  },
  divider: {
    width: 1,
    height: 34,
    backgroundColor: colors.line
  },
  stopRow: {
    marginTop: 28,
    flexDirection: "row",
    gap: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  pauseButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow
  },
  pauseText: {
    fontSize: 30,
    fontWeight: font.heavy,
    color: colors.muted
  },
  stopButton: {
    flex: 1,
    height: 72,
    borderRadius: 28,
    backgroundColor: colors.coralStrong,
    alignItems: "center",
    justifyContent: "center",
    ...shadow
  },
  stopText: {
    fontSize: 26,
    color: colors.surface,
    fontWeight: font.heavy
  },
  syncButton: {
    minWidth: 54,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    ...shadow
  },
  syncText: {
    fontSize: 13,
    color: colors.surface,
    fontWeight: font.heavy
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  sheetTitle: {
    fontSize: 42,
    fontWeight: font.heavy,
    color: colors.ink
  },
  closeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F1F0F1",
    alignItems: "center",
    justifyContent: "center"
  },
  closeText: {
    fontSize: 36,
    color: colors.muted
  },
  historyCard: {
    marginTop: 22,
    minHeight: 116,
    borderRadius: 24,
    padding: 16,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    ...shadow
  },
  mapThumb: {
    width: 92,
    height: 82,
    borderRadius: 18,
    backgroundColor: colors.mapBase,
    borderWidth: 3,
    overflow: "hidden"
  },
  thumbTerritory: {
    width: 70,
    height: 45,
    borderRadius: 12,
    borderWidth: 3,
    marginTop: 18,
    marginLeft: 10,
    transform: [{ rotate: "-12deg" }]
  },
  historyBody: {
    flex: 1,
    marginLeft: 18
  },
  historyTitle: {
    fontSize: 30,
    fontWeight: font.heavy,
    color: colors.ink
  },
  historyPills: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chevron: {
    fontSize: 44,
    color: colors.muted
  },
  rankingTitle: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 28,
    fontWeight: font.heavy,
    color: colors.ink
  },
  podium: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8
  },
  podiumCard: {
    flex: 1,
    minHeight: 158,
    borderRadius: 18,
    backgroundColor: "#F5F3F1",
    alignItems: "center",
    padding: 8
  },
  podiumFirst: {
    minHeight: 185,
    backgroundColor: "#FFF4CC"
  },
  crown: {
    fontSize: 32
  },
  podiumName: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: font.heavy,
    color: colors.ink
  },
  podiumArea: {
    fontSize: 18,
    fontWeight: font.heavy,
    color: colors.ink
  },
  rankRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line
  },
  youRow: {
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 22,
    backgroundColor: "#FFE0DC",
    borderBottomWidth: 0
  },
  rankIndex: {
    minWidth: 42,
    fontSize: 20,
    fontWeight: font.heavy,
    color: colors.coral
  },
  rankName: {
    flex: 1,
    fontSize: 21,
    fontWeight: font.heavy,
    color: colors.ink
  },
  rankArea: {
    fontSize: 18,
    fontWeight: font.heavy,
    color: colors.ink
  },
  modal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
    paddingTop: 78,
    paddingHorizontal: 28,
    paddingBottom: 36,
    zIndex: 2000,
    elevation: 20
  },
  decorCoral: {
    position: "absolute",
    left: -65,
    top: -20,
    width: 190,
    height: 170,
    borderRadius: 80,
    backgroundColor: `${colors.coral}AA`
  },
  decorMint: {
    position: "absolute",
    right: -80,
    bottom: -20,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: `${colors.mint}88`
  },
  modalClose: {
    position: "absolute",
    right: 28,
    top: 78,
    width: 56,
    height: 56,
    zIndex: 2002,
    elevation: 22,
    alignItems: "center",
    justifyContent: "center"
  },
  modalCloseText: {
    fontSize: 48,
    color: colors.ink
  },
  modalTitle: {
    textAlign: "center",
    fontSize: 44,
    fontWeight: font.heavy,
    color: colors.ink
  },
  search: {
    marginTop: 36,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#EFEFEF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24
  },
  searchText: {
    fontSize: 21,
    color: "#9A9698",
    fontWeight: font.bold
  },
  searchIcon: {
    fontSize: 38,
    color: colors.muted
  },
  friendRow: {
    minHeight: 116,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.line
  },
  friendName: {
    fontSize: 29,
    fontWeight: font.heavy,
    color: colors.ink
  },
  friendPills: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  friendMap: {
    width: 64,
    height: 58,
    borderRadius: 15,
    backgroundColor: colors.mapBase,
    alignItems: "center",
    justifyContent: "center",
    ...shadow
  },
  inviteTitle: {
    marginTop: 22,
    fontSize: 28,
    fontWeight: font.heavy,
    color: colors.ink
  },
  inviteBox: {
    marginTop: 12,
    marginBottom: 24,
    height: 64,
    borderRadius: 28,
    backgroundColor: "#EFEFEF",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 18
  },
  inviteUrl: {
    flex: 1,
    fontSize: 20,
    color: colors.ink
  },
  copyButton: {
    paddingHorizontal: 18,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center"
  },
  copyButtonText: {
    fontSize: 20,
    fontWeight: font.heavy,
    color: colors.ink
  },
  confetti: {
    ...StyleSheet.absoluteFillObject
  },
  confettiPiece: {
    position: "absolute",
    width: 12,
    height: 7,
    borderRadius: 4,
    transform: [{ rotate: "18deg" }]
  },
  shareMap: {
    alignSelf: "center",
    marginTop: 48,
    width: "70%",
    height: 150,
    borderRadius: 24,
    backgroundColor: colors.mapBase,
    borderWidth: 8,
    borderColor: colors.surface,
    ...shadow
  },
  shareTerritory: {
    width: "76%",
    height: "58%",
    marginTop: 34,
    marginLeft: 38,
    borderRadius: 18,
    borderWidth: 5,
    borderColor: colors.coral,
    backgroundColor: `${colors.coral}66`,
    transform: [{ rotate: "-9deg" }]
  },
  completeArea: {
    marginTop: 26,
    textAlign: "center",
    fontSize: 54,
    fontWeight: font.heavy,
    color: colors.coral
  },
  completeStats: {
    marginVertical: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8
  }
});
