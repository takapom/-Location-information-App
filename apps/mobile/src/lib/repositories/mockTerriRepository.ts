import type {
  DailyActivity,
  FriendPresence,
  FriendRequestAction,
  FriendRequestActionResult,
  FriendRequestProfile,
  FriendRequestResult,
  FriendSearchResult,
  IncomingFriendRequest,
  LiveTerritoryResult,
  LocationPointInput,
  OutgoingFriendRequest,
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

const initialSearchProfiles: FriendSearchResult[] = [
  { id: "sakura", friendCode: "SAKURA01", displayName: "Sakura", initials: "S", color: colors.coral, totalAreaKm2: 1.5, requestStatus: "accepted" },
  { id: "kenji", friendCode: "KENJI99", displayName: "Kenji_XYZ", initials: "K", color: colors.sky, totalAreaKm2: 3.2, requestStatus: "accepted" },
  { id: "riku", friendCode: "RIKU2026", displayName: "Riku", initials: "R", color: colors.yellow, totalAreaKm2: 0.4, requestStatus: "none" },
  { id: "mei", friendCode: "MEI333", displayName: "Mei", initials: "M", color: colors.pink, totalAreaKm2: 2.1, requestStatus: "pending" }
];

const yuiRequestProfile: FriendRequestProfile = {
  id: "yui",
  friendCode: "YUI777",
  displayName: "Yui",
  initials: "Y",
  color: colors.lavender,
  totalAreaKm2: 0.9
};

const initialIncomingFriendRequests: IncomingFriendRequest[] = [
  {
    friendshipId: "friendship-yui",
    requesterUserId: "yui",
    requester: yuiRequestProfile,
    profile: yuiRequestProfile,
    status: "pending",
    requestedAt: minutesAgo(12)
  }
];

const initialOutgoingFriendRequests: OutgoingFriendRequest[] = [
  {
    friendshipId: "friendship-mei",
    receiverUserId: "mei",
    receiver: {
      id: "mei",
      friendCode: "MEI333",
      displayName: "Mei",
      initials: "M",
      color: colors.pink,
      totalAreaKm2: 2.1
    },
    profile: {
      id: "mei",
      friendCode: "MEI333",
      displayName: "Mei",
      initials: "M",
      color: colors.pink,
      totalAreaKm2: 2.1
    },
    status: "pending",
    requestedAt: minutesAgo(28)
  }
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

function copyFriendRequestProfile(profile: FriendRequestProfile): FriendRequestProfile {
  return { ...profile };
}

function copyIncomingFriendRequest(request: IncomingFriendRequest): IncomingFriendRequest {
  return {
    ...request,
    requester: copyFriendRequestProfile(request.requester),
    profile: copyFriendRequestProfile(request.profile)
  };
}

function copyOutgoingFriendRequest(request: OutgoingFriendRequest): OutgoingFriendRequest {
  return {
    ...request,
    receiver: copyFriendRequestProfile(request.receiver),
    profile: copyFriendRequestProfile(request.profile)
  };
}

function friendPresenceFromRequestProfile(profile: FriendRequestProfile): FriendPresence {
  return {
    id: profile.id,
    displayName: profile.displayName,
    initials: profile.initials,
    color: profile.color,
    totalAreaKm2: profile.totalAreaKm2,
    isActive: false,
    updatedAt: new Date().toISOString(),
    locationSharingEnabled: true,
    position: { latitude: 35.659, longitude: 139.702 },
    avatarUrl: profile.avatarUrl
  };
}

export function createMockTerriRepository(
  seed?: Partial<{
    profile: UserProfile;
    activities: TerritorySummary[];
    friends: FriendPresence[];
    rankings: RankingEntry[];
    searchProfiles: FriendSearchResult[];
    incomingFriendRequests: IncomingFriendRequest[];
    outgoingFriendRequests: OutgoingFriendRequest[];
  }>
): TerriRepository {
  let profile = seed?.profile ?? initialProfile;
  let activities = seed?.activities ?? initialActivities;
  let friends: FriendPresence[] = (seed?.friends ?? initialFriends).map((friend) => ({ ...friend, position: friend.position ? { ...friend.position } : undefined }));
  const rankings = seed?.rankings ?? initialRankings;
  const searchProfiles = (seed?.searchProfiles ?? initialSearchProfiles).map((item) => ({ ...item }));
  let incomingFriendRequests = (seed?.incomingFriendRequests ?? initialIncomingFriendRequests).map(copyIncomingFriendRequest);
  let outgoingFriendRequests = (seed?.outgoingFriendRequests ?? initialOutgoingFriendRequests).map(copyOutgoingFriendRequest);
  const pendingRequests = new Map<string, FriendRequestResult>();
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
      return friends.map((friend) => ({ ...friend, position: friend.position ? { ...friend.position } : undefined }));
    },
    async searchFriendsByCode(query) {
      await wait();
      const normalizedQuery = query.trim().toUpperCase();
      if (normalizedQuery.length < 2) return [];

      return searchProfiles
        .filter((candidate) => candidate.id !== profile.id)
        .filter((candidate) => candidate.friendCode.toUpperCase().includes(normalizedQuery) || candidate.displayName.toUpperCase().includes(normalizedQuery))
        .slice(0, 10)
        .map((candidate) => {
          const request = pendingRequests.get(candidate.friendCode);
          return { ...candidate, requestStatus: request?.status ?? candidate.requestStatus };
        });
    },
    async requestFriendByCode(friendCode) {
      await wait();
      const normalizedCode = friendCode.trim().toUpperCase();
      const candidate = searchProfiles.find((item) => item.friendCode.toUpperCase() === normalizedCode);
      if (!candidate) {
        throw new RepositoryError("ユーザーが見つかりません", "not-found");
      }
      if (candidate.id === profile.id) {
        throw new RepositoryError("自分自身には友達申請できません", "invalid-state");
      }

      const existing = pendingRequests.get(candidate.friendCode);
      if (existing) return { ...existing };

      const status = candidate.requestStatus === "accepted" ? "accepted" : "pending";
      const request: FriendRequestResult = {
        friendshipId: `friendship-${candidate.id}`,
        receiverUserId: candidate.id,
        status
      };
      pendingRequests.set(candidate.friendCode, request);
      candidate.requestStatus = status;
      if (status === "pending" && !outgoingFriendRequests.some((item) => item.friendshipId === request.friendshipId)) {
        const receiver: FriendRequestProfile = {
          id: candidate.id,
          friendCode: candidate.friendCode,
          displayName: candidate.displayName,
          initials: candidate.initials,
          color: candidate.color,
          totalAreaKm2: candidate.totalAreaKm2,
          avatarUrl: candidate.avatarUrl
        };
        outgoingFriendRequests = [
          {
            friendshipId: request.friendshipId,
            receiverUserId: candidate.id,
            receiver,
            profile: receiver,
            status: "pending",
            requestedAt: new Date().toISOString()
          },
          ...outgoingFriendRequests
        ];
      }
      return { ...request };
    },
    async getIncomingFriendRequests() {
      await wait();
      return incomingFriendRequests.map(copyIncomingFriendRequest);
    },
    async getOutgoingFriendRequests() {
      await wait();
      return outgoingFriendRequests.map(copyOutgoingFriendRequest);
    },
    async respondFriendRequest(friendshipId: string, action: FriendRequestAction): Promise<FriendRequestActionResult> {
      await wait();
      if (action !== "accept" && action !== "reject") {
        throw new RepositoryError("未対応の友達申請操作です", "invalid-state");
      }

      const request = incomingFriendRequests.find((item) => item.friendshipId === friendshipId);
      if (!request) {
        if (outgoingFriendRequests.some((item) => item.friendshipId === friendshipId)) {
          throw new RepositoryError("受信した友達申請だけ操作できます", "permission-denied");
        }
        throw new RepositoryError("友達申請が見つかりません", "not-found");
      }

      incomingFriendRequests = incomingFriendRequests.filter((item) => item.friendshipId !== friendshipId);
      if (action === "accept" && !friends.some((friend) => friend.id === request.requesterUserId)) {
        friends = [friendPresenceFromRequestProfile(request.requester), ...friends];
        const searchProfile = searchProfiles.find((item) => item.id === request.requesterUserId);
        if (searchProfile) searchProfile.requestStatus = "accepted";
      }

      return {
        friendshipId,
        requesterUserId: request.requesterUserId,
        receiverUserId: profile.id,
        action,
        status: action === "accept" ? "accepted" : "rejected"
      };
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
