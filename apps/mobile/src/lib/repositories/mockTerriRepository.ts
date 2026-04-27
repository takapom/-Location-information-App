import type {
  DailyActivity,
  FriendPresence,
  LiveTerritoryResult,
  LocationPointInput,
  RankingEntry,
  TerritoryColor,
  TerritorySummary,
  UserProfile
} from "@terri/shared";
import { colors } from "@/theme/tokens";
import type { EnsureDailyActivityInput, TerriRepository } from "./terriRepository";
import { RepositoryError } from "./terriRepository";

const wait = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

const initialProfile: UserProfile = {
  id: "user-current",
  name: "ユーザー名",
  initials: "U",
  emojiStatus: "歩きまくり中",
  territoryColor: colors.coral,
  totalAreaKm2: 3.2,
  totalDistanceKm: 142,
  notificationsEnabled: true,
  backgroundTrackingEnabled: true,
  locationSharingEnabled: true,
  territoryCaptureEnabled: true
};

const initialActivities: TerritorySummary[] = [
  { id: "today", title: "今日", areaKm2: 2.3, distanceKm: 5.2, duration: "42:30", color: colors.coral, createdAtLabel: "今日" },
  { id: "yesterday", title: "昨日", areaKm2: 3.1, distanceKm: 1.7, duration: "18:04", color: colors.mint, createdAtLabel: "昨日" },
  { id: "three-days", title: "3日前", areaKm2: 2.0, distanceKm: 5.2, duration: "35:40", color: colors.lavender, createdAtLabel: "3日前" }
];

const initialFriends: FriendPresence[] = [
  { id: "sakura", displayName: "Sakura", initials: "S", color: colors.coral, totalAreaKm2: 1.5, isActive: true, updatedAt: minutesAgo(1), locationSharingEnabled: true, position: { latitude: 35.6621, longitude: 139.6965 } },
  { id: "kenji", displayName: "Kenji_XYZ", initials: "K", color: colors.sky, totalAreaKm2: 3.2, isActive: false, updatedAt: minutesAgo(8), locationSharingEnabled: true, position: { latitude: 35.6607, longitude: 139.704 } },
  { id: "ami", displayName: "Ami_Travels", initials: "A", color: colors.mint, totalAreaKm2: 0.8, isActive: true, updatedAt: minutesAgo(0), locationSharingEnabled: true, position: { latitude: 35.6602, longitude: 139.7002 } },
  { id: "hana", displayName: "はなこ", initials: "H", color: colors.sky, totalAreaKm2: 6.1, isActive: true, updatedAt: minutesAgo(0), locationSharingEnabled: true, position: { latitude: 35.6581, longitude: 139.7032 } },
  { id: "taro", displayName: "たろう", initials: "T", color: colors.mint, totalAreaKm2: 8.4, isActive: false, updatedAt: minutesAgo(21), locationSharingEnabled: true, position: { latitude: 35.6566, longitude: 139.6984 } },
  { id: "mio", displayName: "Mio", initials: "M", color: colors.lavender, totalAreaKm2: 2.4, isActive: false, updatedAt: minutesAgo(2), locationSharingEnabled: false, position: { latitude: 35.6577, longitude: 139.7053 } }
];

const initialRankings: RankingEntry[] = [
  { id: "taro", rank: 1, name: "たろう", initials: "T", areaKm2: 8.4, deltaKm2: 0.3, color: colors.coral },
  { id: "hana", rank: 2, name: "はなこ", initials: "H", areaKm2: 6.1, deltaKm2: 0.2, color: colors.sky },
  { id: "kenji", rank: 3, name: "けんじ", initials: "K", areaKm2: 4.8, deltaKm2: 0.3, color: colors.mint },
  { id: "user-current", rank: 4, name: "ユーザー", initials: "U", areaKm2: 3.2, deltaKm2: 0.3, color: colors.coral, isCurrentUser: true }
];

type StoredLocationPoint = LocationPointInput & {
  acceptedForGeometry: boolean;
};

function todayLocalDate() {
  return new Date().toISOString().slice(0, 10);
}

function createDailyActivity(input: EnsureDailyActivityInput): DailyActivity {
  return {
    id: `daily-${input.localDate}`,
    localDate: input.localDate,
    timezone: input.timezone,
    status: "open",
    stats: { elapsed: "00:00:00", distanceKm: 0, previewAreaKm2: 0, lastSyncedAt: undefined }
  };
}

export function createMockTerriRepository(seed?: Partial<{ profile: UserProfile; activities: TerritorySummary[]; friends: FriendPresence[]; rankings: RankingEntry[] }>): TerriRepository {
  let profile = seed?.profile ?? initialProfile;
  let activities = seed?.activities ?? initialActivities;
  const friends = seed?.friends ?? initialFriends;
  const rankings = seed?.rankings ?? initialRankings;
  const dailyActivities = new Map<string, DailyActivity>();
  const locationPoints = new Map<string, StoredLocationPoint[]>();

  function getDailyActivityById(dailyActivityId: string) {
    const dailyActivity = [...dailyActivities.values()].find((item) => item.id === dailyActivityId);
    if (!dailyActivity) {
      throw new RepositoryError("日次アクティビティが見つかりません", "not-found");
    }
    return dailyActivity;
  }

  function createTerritorySummary(dailyActivity: DailyActivity, areaKm2: number, distanceKm: number): TerritorySummary {
    return {
      id: dailyActivity.id,
      title: "今日",
      areaKm2,
      distanceKm,
      duration: "進行中",
      color: profile.territoryColor,
      createdAtLabel: dailyActivity.localDate === todayLocalDate() ? "今日" : dailyActivity.localDate
    };
  }

  async function syncLiveTerritory(dailyActivityId: string): Promise<LiveTerritoryResult> {
    await wait();
    const dailyActivity = getDailyActivityById(dailyActivityId);
    if (dailyActivity.status === "finalized") {
      throw new RepositoryError("確定済みの日次アクティビティは同期できません", "invalid-state");
    }

    const acceptedPointCount = (locationPoints.get(dailyActivityId) ?? []).filter((point) => point.acceptedForGeometry).length;
    const distanceKm = acceptedPointCount >= 2 ? Number(((acceptedPointCount - 1) * 0.12).toFixed(1)) : 0;
    const areaKm2 = acceptedPointCount >= 2 ? Number(Math.max(0.08, acceptedPointCount * 0.015).toFixed(2)) : 0;
    const syncedAt = new Date().toISOString();
    const stats = { elapsed: "進行中", distanceKm, previewAreaKm2: areaKm2, lastSyncedAt: syncedAt };
    const nextDailyActivity = { ...dailyActivity, stats };
    const territory = createTerritorySummary(dailyActivity, areaKm2, distanceKm);

    dailyActivities.set(dailyActivity.localDate, nextDailyActivity);
    activities = [territory, ...activities.filter((activity) => activity.id !== dailyActivityId)];

    return { dailyActivity: nextDailyActivity, territory, stats };
  }

  return {
    async getProfile() {
      await wait();
      return { ...profile };
    },
    async updateProfile(input) {
      await wait();
      profile = { ...profile, ...input };
      return { ...profile };
    },
    async updateTerritoryColor(color) {
      await wait();
      profile = { ...profile, territoryColor: color };
      return { ...profile };
    },
    async getFriends() {
      await wait();
      return friends.map((friend) => ({ ...friend }));
    },
    async getRankings() {
      await wait();
      return rankings.map((ranking) => ({ ...ranking }));
    },
    async getActivities() {
      await wait();
      return activities.map((activity) => ({ ...activity }));
    },
    async getActivity(activityId) {
      await wait();
      const activity = activities.find((item) => item.id === activityId);
      if (!activity) {
        throw new RepositoryError("アクティビティが見つかりません", "not-found");
      }
      return { ...activity };
    },
    async ensureDailyActivity(input) {
      await wait();
      if (!profile.territoryCaptureEnabled) {
        throw new RepositoryError("テリトリー生成がOFFです", "permission-denied");
      }

      const existing = dailyActivities.get(input.localDate);
      if (existing) return { ...existing, stats: { ...existing.stats } };

      const dailyActivity = createDailyActivity(input);
      dailyActivities.set(input.localDate, dailyActivity);
      locationPoints.set(dailyActivity.id, []);
      return { ...dailyActivity, stats: { ...dailyActivity.stats } };
    },
    async appendLocationPoint(input) {
      await wait();
      if (!profile.territoryCaptureEnabled) {
        throw new RepositoryError("テリトリー生成がOFFです", "permission-denied");
      }
      if (!locationPoints.has(input.dailyActivityId)) {
        throw new RepositoryError("日次アクティビティが見つかりません", "not-found");
      }
      if (getDailyActivityById(input.dailyActivityId).status === "finalized") {
        throw new RepositoryError("確定済みの日次アクティビティにはGPS点を追加できません", "invalid-state");
      }

      const points = locationPoints.get(input.dailyActivityId) ?? [];
      points.push({ ...input, acceptedForGeometry: input.accuracyM < 50 });
      locationPoints.set(input.dailyActivityId, points);
    },
    syncLiveTerritory,
    async finalizeDailyActivity(dailyActivityId) {
      await wait();
      const dailyActivity = getDailyActivityById(dailyActivityId);
      if (dailyActivity.status === "finalized") {
        const existing = activities.find((activity) => activity.id === dailyActivityId);
        const territory = existing ?? createTerritorySummary(dailyActivity, dailyActivity.stats.previewAreaKm2, dailyActivity.stats.distanceKm);
        return { dailyActivity, territory };
      }

      const synced = await syncLiveTerritory(dailyActivityId);
      const finalized = { ...synced.dailyActivity, status: "finalized" as const };
      dailyActivities.set(finalized.localDate, finalized);
      return { dailyActivity: finalized, territory: synced.territory };
    }
  };
}

export const mockTerriRepository: TerriRepository = createMockTerriRepository();
