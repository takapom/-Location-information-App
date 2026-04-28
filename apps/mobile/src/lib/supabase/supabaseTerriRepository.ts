import type {
  DailyActivity,
  FinalizedDailyActivity,
  FriendPresence,
  FriendRequestAction,
  FriendRequestActionResult,
  FriendRequestProfile,
  FriendRequestResult,
  FriendRequestStatus,
  FriendSearchResult,
  FriendTerritory,
  IncomingFriendRequest,
  LiveTerritoryResult,
  LocationPointInput,
  OutgoingFriendRequest,
  RankingEntry,
  TerritoryColor,
  TerritoryGeometry,
  TerritorySummary,
  UserProfile
} from "@terri/shared";
import { colors } from "@/theme/tokens";
import type { EnsureDailyActivityInput, TerriRepository } from "@/lib/repositories/terriRepository";
import { RepositoryError } from "@/lib/repositories/terriRepository";
import { getSupabaseClient } from "./supabaseClient";

type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  territory_color: string;
  emoji_status: string | null;
  location_sharing_enabled: boolean;
  territory_capture_enabled: boolean;
  background_tracking_enabled: boolean;
  notifications_enabled: boolean;
};

type FriendSearchRow = {
  id: string;
  friend_code: string;
  display_name: string;
  avatar_url: string | null;
  territory_color: string;
  total_area_m2: number;
  request_status: string;
};

type FriendRequestRow = {
  friendship_id: string;
  receiver_user_id: string;
  status: "pending" | "accepted";
};

type IncomingFriendRequestRow = {
  friendship_id: string;
  requester_user_id: string;
  friend_code: string;
  display_name: string;
  avatar_url: string | null;
  territory_color: string;
  total_area_m2: number;
  requested_at: string;
};

type OutgoingFriendRequestRow = {
  friendship_id: string;
  receiver_user_id: string;
  friend_code: string;
  display_name: string;
  avatar_url: string | null;
  territory_color: string;
  total_area_m2: number;
  requested_at: string;
};

type FriendRequestActionRow = {
  friendship_id: string;
  requester_user_id: string;
  receiver_user_id: string;
  action: FriendRequestAction;
  status: "accepted" | "rejected";
};

type AcceptedFriendRow = {
  friend_user_id: string;
  friend_code: string;
  display_name: string;
  avatar_url: string | null;
  territory_color: string;
  location_sharing_enabled: boolean;
  total_area_m2: number;
  accepted_at: string;
};

type RankingRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  territory_color: string | null;
  total_area_m2: number;
  delta_area_m2: number;
  rank: number;
  is_current_user: boolean;
};

type FriendTerritoryRow = {
  territory_id: string;
  friend_user_id: string;
  display_name: string;
  territory_color: string | null;
  area_m2: number;
  calculated_at: string;
  polygon_geojson: TerritoryGeometry;
};

type DailyActivityRow = {
  id: string;
  user_id: string;
  local_date: string;
  timezone: string;
  status: "open" | "finalized" | "paused";
  started_at: string | null;
  ended_at: string | null;
  distance_m: number;
  area_m2: number;
  point_count: number;
  created_at: string;
  updated_at: string;
};

type FunctionResult = {
  dailyActivityId?: string;
  territoryId?: string;
  finalTerritoryId?: string;
  pointCount?: number;
  distanceM?: number;
  areaM2?: number;
  state?: "live" | "final";
};

const defaultName = "TERRI User";

function normalizeError(error: unknown, fallback: string): RepositoryError {
  if (error instanceof RepositoryError) return error;
  const message = error instanceof Error ? error.message : fallback;
  const lower = message.toLowerCase();
  if (lower.includes("auth") || lower.includes("permission") || lower.includes("jwt")) return new RepositoryError(message, "permission-denied");
  if (lower.includes("not found") || lower.includes("not-found") || lower.includes("p0002")) return new RepositoryError(message, "not-found");
  if (lower.includes("finalized") || lower.includes("not syncable") || lower.includes("yourself")) return new RepositoryError(message, "invalid-state");
  return new RepositoryError(message, "network");
}

function asTerritoryColor(value: string | null | undefined): TerritoryColor {
  const supported: TerritoryColor[] = [colors.coral, colors.mint, colors.lavender, colors.sky, colors.yellow, colors.pink];
  return supported.includes(value as TerritoryColor) ? (value as TerritoryColor) : colors.coral;
}

function initialsFromName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "U";
  return Array.from(trimmed).slice(0, 2).join("").toUpperCase();
}

function formatDuration(startedAt: string | null, endedAt: string | null) {
  if (!startedAt || !endedAt) return "進行中";
  const seconds = Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatActivityLabel(localDate: string) {
  const today = new Date().toISOString().slice(0, 10);
  return localDate === today ? "今日" : localDate;
}

export function mapDailyActivityRow(row: DailyActivityRow): DailyActivity {
  return {
    id: row.id,
    localDate: row.local_date,
    timezone: row.timezone,
    status: row.status,
    stats: {
      elapsed: formatDuration(row.started_at, row.ended_at),
      distanceKm: Number((row.distance_m / 1000).toFixed(2)),
      previewAreaKm2: Number((row.area_m2 / 1_000_000).toFixed(4)),
      lastSyncedAt: row.updated_at
    }
  };
}

export function mapActivitySummary(row: DailyActivityRow, color: TerritoryColor): TerritorySummary {
  return {
    id: row.id,
    title: formatActivityLabel(row.local_date),
    areaKm2: Number((row.area_m2 / 1_000_000).toFixed(4)),
    distanceKm: Number((row.distance_m / 1000).toFixed(2)),
    duration: formatDuration(row.started_at, row.ended_at),
    color,
    createdAtLabel: formatActivityLabel(row.local_date)
  };
}

function mapProfileRow(row: ProfileRow, totals: { areaKm2: number; distanceKm: number }): UserProfile {
  return {
    id: row.id,
    name: row.display_name,
    initials: initialsFromName(row.display_name),
    emojiStatus: row.emoji_status ?? "歩きまくり中",
    territoryColor: asTerritoryColor(row.territory_color),
    totalAreaKm2: totals.areaKm2,
    totalDistanceKm: totals.distanceKm,
    notificationsEnabled: row.notifications_enabled,
    backgroundTrackingEnabled: row.background_tracking_enabled,
    locationSharingEnabled: row.location_sharing_enabled,
    territoryCaptureEnabled: row.territory_capture_enabled
  };
}

function asFriendRequestStatus(value: string): FriendRequestStatus {
  return value === "pending" || value === "accepted" ? value : "none";
}

export function mapFriendSearchRow(row: FriendSearchRow): FriendSearchResult {
  return {
    id: row.id,
    friendCode: row.friend_code,
    displayName: row.display_name,
    initials: initialsFromName(row.display_name),
    color: asTerritoryColor(row.territory_color),
    totalAreaKm2: Number((row.total_area_m2 / 1_000_000).toFixed(4)),
    requestStatus: asFriendRequestStatus(row.request_status),
    avatarUrl: row.avatar_url ?? undefined
  };
}

function mapFriendRequestProfile(row: {
  id: string;
  friend_code: string;
  display_name: string;
  avatar_url: string | null;
  territory_color: string;
  total_area_m2: number;
}): FriendRequestProfile {
  return {
    id: row.id,
    friendCode: row.friend_code,
    displayName: row.display_name,
    initials: initialsFromName(row.display_name),
    color: asTerritoryColor(row.territory_color),
    totalAreaKm2: Number((row.total_area_m2 / 1_000_000).toFixed(4)),
    avatarUrl: row.avatar_url ?? undefined
  };
}

export function mapIncomingFriendRequestRow(row: IncomingFriendRequestRow): IncomingFriendRequest {
  const requester = mapFriendRequestProfile({
    id: row.requester_user_id,
    friend_code: row.friend_code,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    territory_color: row.territory_color,
    total_area_m2: row.total_area_m2
  });
  return {
    friendshipId: row.friendship_id,
    requesterUserId: row.requester_user_id,
    requester,
    profile: requester,
    status: "pending",
    requestedAt: row.requested_at
  };
}

export function mapOutgoingFriendRequestRow(row: OutgoingFriendRequestRow): OutgoingFriendRequest {
  const receiver = mapFriendRequestProfile({
    id: row.receiver_user_id,
    friend_code: row.friend_code,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    territory_color: row.territory_color,
    total_area_m2: row.total_area_m2
  });
  return {
    friendshipId: row.friendship_id,
    receiverUserId: row.receiver_user_id,
    receiver,
    profile: receiver,
    status: "pending",
    requestedAt: row.requested_at
  };
}

export function mapAcceptedFriendRow(row: AcceptedFriendRow): FriendPresence {
  return {
    id: row.friend_user_id,
    displayName: row.display_name,
    initials: initialsFromName(row.display_name),
    color: asTerritoryColor(row.territory_color),
    totalAreaKm2: Number((row.total_area_m2 / 1_000_000).toFixed(4)),
    isActive: false,
    updatedAt: row.accepted_at,
    locationSharingEnabled: row.location_sharing_enabled,
    avatarUrl: row.avatar_url ?? undefined
  };
}

export function mapRankingRow(row: RankingRow): RankingEntry {
  const name = row.display_name?.trim() || defaultName;
  return {
    id: row.user_id,
    rank: row.rank,
    name,
    initials: initialsFromName(name),
    areaKm2: Number(((row.total_area_m2 ?? 0) / 1_000_000).toFixed(4)),
    deltaKm2: Number(((row.delta_area_m2 ?? 0) / 1_000_000).toFixed(4)),
    color: asTerritoryColor(row.territory_color),
    isCurrentUser: row.is_current_user
  };
}

export function mapFriendTerritoryRow(row: FriendTerritoryRow): FriendTerritory {
  return {
    id: row.territory_id,
    friendUserId: row.friend_user_id,
    displayName: row.display_name,
    color: asTerritoryColor(row.territory_color),
    areaKm2: Number(((row.area_m2 ?? 0) / 1_000_000).toFixed(4)),
    calculatedAt: row.calculated_at,
    polygon: row.polygon_geojson
  };
}

function unwrapFunctionResult(data: unknown): FunctionResult {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: FunctionResult }).data ?? {};
  }
  return (data as FunctionResult | null) ?? {};
}

function hasDuplicateKeyError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: string; message?: string };
  return maybeError.code === "23505" || maybeError.message?.toLowerCase().includes("duplicate key");
}

function omitUndefined<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

export function createSupabaseTerriRepository(): TerriRepository {
  const supabase = getSupabaseClient();

  async function getCurrentUserId() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw new RepositoryError(error?.message ?? "ログインが必要です", "permission-denied");
    }
    return data.user.id;
  }

  async function getTotals(userId: string) {
    const { data, error } = await supabase.from("daily_activities").select("distance_m, area_m2").eq("user_id", userId);
    if (error) throw error;
    const rows = (data ?? []) as Array<Pick<DailyActivityRow, "distance_m" | "area_m2">>;
    return rows.reduce(
      (acc, row) => ({
        areaKm2: Number((acc.areaKm2 + row.area_m2 / 1_000_000).toFixed(4)),
        distanceKm: Number((acc.distanceKm + row.distance_m / 1000).toFixed(2))
      }),
      { areaKm2: 0, distanceKm: 0 }
    );
  }

  async function ensureProfile(): Promise<UserProfile> {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw error;

    const row =
      (data as ProfileRow | null) ??
      (await (async () => {
        const { data: inserted, error: insertError } = await supabase
          .from("profiles")
          .upsert({
            id: userId,
            display_name: defaultName,
            territory_color: colors.coral,
            emoji_status: "歩きまくり中"
          }, { onConflict: "id" })
          .select("*")
          .single();
        if (insertError) throw insertError;
        return inserted as ProfileRow;
      })());

    return mapProfileRow(row, await getTotals(userId));
  }

  async function getProfileColor() {
    return (await ensureProfile()).territoryColor;
  }

  async function getDailyActivityRow(dailyActivityId: string) {
    const { data, error } = await supabase.from("daily_activities").select("*").eq("id", dailyActivityId).maybeSingle();
    if (error) throw error;
    if (!data) throw new RepositoryError("アクティビティが見つかりません", "not-found");
    return data as DailyActivityRow;
  }

  async function buildLiveResult(dailyActivityId: string): Promise<LiveTerritoryResult> {
    const row = await getDailyActivityRow(dailyActivityId);
    const color = await getProfileColor();
    const dailyActivity = mapDailyActivityRow(row);
    const territory = mapActivitySummary(row, color);
    return { dailyActivity, territory, stats: dailyActivity.stats };
  }

  return {
    async getProfile() {
      try {
        return await ensureProfile();
      } catch (error) {
        throw normalizeError(error, "プロフィールを取得できませんでした");
      }
    },
    async updateProfile(input) {
      try {
        const userId = await getCurrentUserId();
        const patch = omitUndefined({
          notifications_enabled: input.notificationsEnabled,
          background_tracking_enabled: input.backgroundTrackingEnabled,
          location_sharing_enabled: input.locationSharingEnabled,
          territory_capture_enabled: input.territoryCaptureEnabled,
          updated_at: new Date().toISOString()
        });
        const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
        if (error) throw error;
        return await ensureProfile();
      } catch (error) {
        throw normalizeError(error, "プロフィールを更新できませんでした");
      }
    },
    async updateTerritoryColor(color) {
      try {
        const userId = await getCurrentUserId();
        const { error } = await supabase.from("profiles").update({ territory_color: color, updated_at: new Date().toISOString() }).eq("id", userId);
        if (error) throw error;
        return await ensureProfile();
      } catch (error) {
        throw normalizeError(error, "陣地色を更新できませんでした");
      }
    },
    async getFriends() {
      try {
        const { data, error } = await supabase.rpc("list_accepted_friends");
        if (error) throw error;
        return ((data ?? []) as AcceptedFriendRow[]).map(mapAcceptedFriendRow);
      } catch (error) {
        throw normalizeError(error, "友達一覧を取得できませんでした");
      }
    },
    async searchFriendsByCode(query) {
      try {
        const { data, error } = await supabase.rpc("search_profiles_by_friend_code", { p_query: query });
        if (error) throw error;
        return ((data ?? []) as FriendSearchRow[]).map(mapFriendSearchRow);
      } catch (error) {
        throw normalizeError(error, "友達を検索できませんでした");
      }
    },
    async requestFriendByCode(friendCode): Promise<FriendRequestResult> {
      try {
        const { data, error } = await supabase.rpc("request_friend_by_code", { p_friend_code: friendCode });
        if (error) throw error;
        const row = ((data ?? []) as FriendRequestRow[])[0];
        if (!row) throw new RepositoryError("友達申請を作成できませんでした", "network");
        return {
          friendshipId: row.friendship_id,
          receiverUserId: row.receiver_user_id,
          status: row.status
        };
      } catch (error) {
        throw normalizeError(error, "友達申請を作成できませんでした");
      }
    },
    async getIncomingFriendRequests() {
      try {
        const { data, error } = await supabase.rpc("list_incoming_friend_requests");
        if (error) throw error;
        return ((data ?? []) as IncomingFriendRequestRow[]).map(mapIncomingFriendRequestRow);
      } catch (error) {
        throw normalizeError(error, "受信した友達申請を取得できませんでした");
      }
    },
    async getOutgoingFriendRequests() {
      try {
        const { data, error } = await supabase.rpc("list_outgoing_friend_requests");
        if (error) throw error;
        return ((data ?? []) as OutgoingFriendRequestRow[]).map(mapOutgoingFriendRequestRow);
      } catch (error) {
        throw normalizeError(error, "送信した友達申請を取得できませんでした");
      }
    },
    async respondFriendRequest(friendshipId, action): Promise<FriendRequestActionResult> {
      try {
        const { data, error } = await supabase.rpc("respond_friend_request", { p_friendship_id: friendshipId, p_action: action });
        if (error) throw error;
        const row = ((data ?? []) as FriendRequestActionRow[])[0];
        if (!row) throw new RepositoryError("友達申請を更新できませんでした", "network");
        return {
          friendshipId: row.friendship_id,
          requesterUserId: row.requester_user_id,
          receiverUserId: row.receiver_user_id,
          action: row.action,
          status: row.status
        };
      } catch (error) {
        throw normalizeError(error, "友達申請を更新できませんでした");
      }
    },
    async getRankings() {
      try {
        await ensureProfile();
        const { data, error } = await supabase.rpc("list_friend_rankings");
        if (error) throw error;
        return ((data ?? []) as RankingRow[]).map(mapRankingRow);
      } catch (error) {
        throw normalizeError(error, "ランキングを取得できませんでした");
      }
    },
    async getFriendTerritories() {
      try {
        const { data, error } = await supabase.rpc("list_friend_territories");
        if (error) throw error;
        return ((data ?? []) as FriendTerritoryRow[]).map(mapFriendTerritoryRow);
      } catch (error) {
        throw normalizeError(error, "友達の陣地を取得できませんでした");
      }
    },
    async getActivities() {
      try {
        const color = await getProfileColor();
        const { data, error } = await supabase.from("daily_activities").select("*").order("local_date", { ascending: false });
        if (error) throw error;
        return ((data ?? []) as DailyActivityRow[]).map((row) => mapActivitySummary(row, color));
      } catch (error) {
        throw normalizeError(error, "履歴を取得できませんでした");
      }
    },
    async getActivity(activityId) {
      try {
        return mapActivitySummary(await getDailyActivityRow(activityId), await getProfileColor());
      } catch (error) {
        throw normalizeError(error, "アクティビティを取得できませんでした");
      }
    },
    async ensureDailyActivity(input: EnsureDailyActivityInput) {
      try {
        await ensureProfile();
        const findExisting = async () => {
          const { data: existing, error: selectError } = await supabase
            .from("daily_activities")
            .select("*")
            .eq("local_date", input.localDate)
            .maybeSingle();
          if (selectError) throw selectError;
          return existing as DailyActivityRow | null;
        };

        const existing = await findExisting();
        if (existing) return mapDailyActivityRow(existing);

        const { data, error } = await supabase
          .from("daily_activities")
          .insert({ local_date: input.localDate, timezone: input.timezone, status: "open" })
          .select("*")
          .single();
        if (error && hasDuplicateKeyError(error)) {
          const duplicated = await findExisting();
          if (duplicated) return mapDailyActivityRow(duplicated);
        }
        if (error) throw error;
        return mapDailyActivityRow(data as DailyActivityRow);
      } catch (error) {
        throw normalizeError(error, "日次アクティビティを作成できませんでした");
      }
    },
    async appendLocationPoint(input: LocationPointInput) {
      try {
        const { error } = await supabase.from("location_points").insert({
          daily_activity_id: input.dailyActivityId,
          position: `POINT(${input.longitude} ${input.latitude})`,
          accuracy_m: input.accuracyM,
          speed_mps: input.speedMps,
          recorded_at: input.recordedAt,
          accepted_for_geometry: input.accuracyM < 50
        });
        if (error) throw error;
      } catch (error) {
        throw normalizeError(error, "GPS点を保存できませんでした");
      }
    },
    async syncLiveTerritory(dailyActivityId) {
      try {
        const { data, error } = await supabase.rpc("sync_live_territory", { p_daily_activity_id: dailyActivityId });
        if (error) throw error;
        const result = unwrapFunctionResult(data);
        return await buildLiveResult(result.dailyActivityId ?? dailyActivityId);
      } catch (error) {
        throw normalizeError(error, "テリトリーを同期できませんでした");
      }
    },
    async finalizeDailyActivity(dailyActivityId): Promise<FinalizedDailyActivity> {
      try {
        const { data, error } = await supabase.rpc("finalize_daily_activity", { p_daily_activity_id: dailyActivityId });
        if (error) throw error;
        const result = unwrapFunctionResult(data);
        const liveResult = await buildLiveResult(result.dailyActivityId ?? dailyActivityId);
        return { dailyActivity: liveResult.dailyActivity, territory: liveResult.territory };
      } catch (error) {
        throw normalizeError(error, "日次アクティビティを確定できませんでした");
      }
    }
  };
}
