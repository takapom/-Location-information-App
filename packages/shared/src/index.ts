export type TerritoryColor = "#F07060" | "#6DCFB0" | "#B8A0E8" | "#6BBBEF" | "#FFD95C" | "#F23B8D";

export type TerritorySummary = {
  id: string;
  title: string;
  areaKm2: number;
  distanceKm: number;
  duration: string;
  color: TerritoryColor;
  createdAtLabel: string;
  polygon?: TerritoryGeometry;
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

export type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

export type GeoJsonMultiPolygon = {
  type: "MultiPolygon";
  coordinates: number[][][][];
};

export type TerritoryGeometry = GeoJsonPolygon | GeoJsonMultiPolygon;

export type FriendPresence = {
  id: string;
  displayName: string;
  initials: string;
  color: TerritoryColor;
  totalAreaKm2: number;
  isActive: boolean;
  updatedAt: string;
  locationSharingEnabled: boolean;
  position?: GeoPoint;
  avatarUrl?: string;
};

export type FriendLivePresencePayload = {
  userId: string;
  position: GeoPoint;
  updatedAt: string;
  isActive: boolean;
  locationSharingEnabled: boolean;
  accuracyM?: number;
};

export type FriendTerritory = {
  id: string;
  friendUserId: string;
  displayName: string;
  color: TerritoryColor;
  areaKm2: number;
  calculatedAt: string;
  polygon: TerritoryGeometry;
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

export type FriendRequestAction = "accept" | "reject";

export type FriendRequestProfile = {
  id: string;
  friendCode: string;
  displayName: string;
  initials: string;
  color: TerritoryColor;
  totalAreaKm2: number;
  avatarUrl?: string;
};

export type FriendRequest = {
  friendshipId: string;
  status: "pending";
  requestedAt: string;
  profile: FriendRequestProfile;
};

export type IncomingFriendRequest = FriendRequest & {
  requesterUserId: string;
  requester: FriendRequestProfile;
};

export type OutgoingFriendRequest = FriendRequest & {
  receiverUserId: string;
  receiver: FriendRequestProfile;
};

export type FriendRequestActionResult = {
  friendshipId: string;
  requesterUserId: string;
  receiverUserId: string;
  action: FriendRequestAction;
  status: "accepted" | "rejected";
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
  friendCode: string;
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
