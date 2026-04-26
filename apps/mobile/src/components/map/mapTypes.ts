import type { TerritoryColor } from "@terri/shared";

export type MapFriendMarker = {
  id: string;
  displayName: string;
  initials: string;
  color: TerritoryColor;
  totalAreaKm2: number;
  isActive: boolean;
  updatedLabel: string;
  latitude: number;
  longitude: number;
};
