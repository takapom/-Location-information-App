import type {
  DailyActivity,
  FinalizedDailyActivity,
  FriendPresence,
  FriendRequestResult,
  FriendSearchResult,
  LiveTerritoryResult,
  LocationPointInput,
  RankingEntry,
  TerritoryColor,
  TerritorySummary,
  UserProfile
} from "@terri/shared";

export type EnsureDailyActivityInput = {
  localDate: string;
  timezone: string;
};

export interface TerriRepository {
  getProfile(): Promise<UserProfile>;
  updateProfile(input: Partial<Pick<UserProfile, "notificationsEnabled" | "backgroundTrackingEnabled" | "locationSharingEnabled" | "territoryCaptureEnabled">>): Promise<UserProfile>;
  updateTerritoryColor(color: TerritoryColor): Promise<UserProfile>;
  getFriends(): Promise<FriendPresence[]>;
  searchFriendsByCode(query: string): Promise<FriendSearchResult[]>;
  requestFriendByCode(friendCode: string): Promise<FriendRequestResult>;
  getRankings(): Promise<RankingEntry[]>;
  getActivities(): Promise<TerritorySummary[]>;
  getActivity(activityId: string): Promise<TerritorySummary>;
  ensureDailyActivity(input: EnsureDailyActivityInput): Promise<DailyActivity>;
  appendLocationPoint(input: LocationPointInput): Promise<void>;
  syncLiveTerritory(dailyActivityId: string): Promise<LiveTerritoryResult>;
  finalizeDailyActivity(dailyActivityId: string): Promise<FinalizedDailyActivity>;
}

export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: "permission-denied" | "network" | "not-found" | "invalid-state"
  ) {
    super(message);
  }
}
