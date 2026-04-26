import type {
  FriendPresence,
  RankingEntry,
  TerritoryColor,
  TerritorySummary,
  TrackingStats,
  UserProfile
} from "@terri/shared";

export type StartActivityResult = {
  activityId: string;
  initialStats: TrackingStats;
};

export type CompleteActivityResult = {
  territory: TerritorySummary;
  stats: TrackingStats;
};

export interface TerriRepository {
  getProfile(): Promise<UserProfile>;
  updateProfile(input: Partial<Pick<UserProfile, "notificationsEnabled" | "backgroundTrackingEnabled" | "locationSharingEnabled">>): Promise<UserProfile>;
  updateTerritoryColor(color: TerritoryColor): Promise<UserProfile>;
  getFriends(): Promise<FriendPresence[]>;
  getRankings(): Promise<RankingEntry[]>;
  getActivities(): Promise<TerritorySummary[]>;
  getActivity(activityId: string): Promise<TerritorySummary>;
  startActivity(): Promise<StartActivityResult>;
  completeActivity(activityId: string): Promise<CompleteActivityResult>;
}

export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: "permission-denied" | "network" | "not-found" | "invalid-state"
  ) {
    super(message);
  }
}
