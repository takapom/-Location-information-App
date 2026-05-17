import type { GeoPoint, TerritoryColor, TerritoryGeometry } from "@terri/shared";
import type { MapPrivacyLabel } from "./mapPrivacyLabel";

export type MapViewportFollowMode = "autoUntilUserMoves" | "manual";

export type { MapPrivacyLabel } from "./mapPrivacyLabel";

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

export type MapTerritoryFeature = {
  id: string;
  userId?: string;
  displayName?: string;
  color: TerritoryColor;
  areaKm2?: number;
  geometry: TerritoryGeometry;
};

export type MapRouteFeature = {
  id: string;
  color: TerritoryColor;
  coordinates: GeoPoint[];
};

export type MapScene = {
  viewport: {
    center?: GeoPoint;
    currentLocation?: GeoPoint;
    followMode: MapViewportFollowMode;
  };
  user: {
    marker?: MapSelfMarker;
  };
  layers: {
    ownFinalTerritories: MapTerritoryFeature[];
    friendFinalTerritories: MapTerritoryFeature[];
    livePreview?: MapTerritoryFeature;
    trackingRoute?: MapRouteFeature;
    friends: MapFriendMarker[];
  };
  chrome: {
    placeLabel: string;
    activeFriendCount: number;
    privacyLabel: MapPrivacyLabel;
    attribution: string;
  };
};
