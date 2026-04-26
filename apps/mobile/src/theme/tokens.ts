import type { TerritoryColor } from "@terri/shared";

export const colors = {
  coral: "#F07060" as TerritoryColor,
  coralStrong: "#F43D3D",
  mint: "#6DCFB0" as TerritoryColor,
  lavender: "#B8A0E8" as TerritoryColor,
  sky: "#6BBBEF" as TerritoryColor,
  yellow: "#FFD95C" as TerritoryColor,
  pink: "#F23B8D" as TerritoryColor,
  ink: "#050505",
  muted: "#77727D",
  line: "#E8E3DF",
  surface: "#FFFFFF",
  mapBase: "#FFF7EA",
  road: "#F4DDA3",
  park: "#BFEBD7",
  water: "#A7DFF5"
};

export const territoryColors: TerritoryColor[] = [
  colors.coral,
  colors.mint,
  colors.lavender,
  colors.sky,
  colors.yellow,
  colors.pink
];

export const shadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.16,
  shadowRadius: 18,
  elevation: 8
};

export const font = {
  heavy: "900" as const,
  bold: "800" as const,
  semibold: "700" as const
};
