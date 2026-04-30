import type { FriendTerritory, GeoPoint, TerritoryColor } from "@terri/shared";

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

export type MapSelfMarker = {
  initials: string;
  color: TerritoryColor;
};

export type MapSurfaceProps = {
  center?: GeoPoint;
  currentLocation?: GeoPoint;
  currentUser?: MapSelfMarker;
  friends?: MapFriendMarker[];
  friendTerritories?: FriendTerritory[];
  activeFriendCount?: number;
  live?: boolean;
  showRoute?: boolean;
};
