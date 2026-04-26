export type TerritoryColor = "#F07060" | "#6DCFB0" | "#B8A0E8" | "#6BBBEF" | "#FFD95C" | "#F23B8D";

export type TerritorySummary = {
  id: string;
  title: string;
  areaKm2: number;
  distanceKm: number;
  duration: string;
  color: TerritoryColor;
  createdAtLabel: string;
};

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type FriendPresence = {
  id: string;
  displayName: string;
  initials: string;
  color: TerritoryColor;
  totalAreaKm2: number;
  isActive: boolean;
  updatedAt: string;
  locationSharingEnabled: boolean;
  position: GeoPoint;
  avatarUrl?: string;
};

export type RankingEntry = {
  id: string;
  rank: number;
  name: string;
  initials: string;
  areaKm2: number;
  deltaKm2: number;
  color: TerritoryColor;
  isCurrentUser?: boolean;
};

export type UserProfile = {
  id: string;
  name: string;
  initials: string;
  emojiStatus: string;
  territoryColor: TerritoryColor;
  totalAreaKm2: number;
  totalDistanceKm: number;
  notificationsEnabled: boolean;
  backgroundTrackingEnabled: boolean;
  locationSharingEnabled: boolean;
};

export type TrackingStats = {
  elapsed: string;
  distanceKm: number;
  previewAreaKm2: number;
};
