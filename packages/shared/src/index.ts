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

export type DailyActivityStatus = "open" | "finalized" | "paused";

export type LiveTerritoryStats = {
  elapsed: string;
  distanceKm: number;
  previewAreaKm2: number;
  lastSyncedAt?: string;
};

export type DailyActivity = {
  id: string;
  localDate: string;
  timezone: string;
  status: DailyActivityStatus;
  stats: LiveTerritoryStats;
};

export type LocationPointInput = {
  dailyActivityId: string;
  latitude: number;
  longitude: number;
  accuracyM: number;
  speedMps?: number;
  recordedAt: string;
};

export type LiveTerritoryResult = {
  dailyActivity: DailyActivity;
  territory: TerritorySummary;
  stats: LiveTerritoryStats;
};

export type FinalizedDailyActivity = {
  dailyActivity: DailyActivity;
  territory: TerritorySummary;
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

export type FriendRequestStatus = "none" | "pending" | "accepted";

export type FriendSearchResult = {
  id: string;
  friendCode: string;
  displayName: string;
  initials: string;
  color: TerritoryColor;
  totalAreaKm2: number;
  requestStatus: FriendRequestStatus;
  avatarUrl?: string;
};

export type FriendRequestResult = {
  friendshipId: string;
  receiverUserId: string;
  status: "pending" | "accepted";
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
  territoryCaptureEnabled: boolean;
};
