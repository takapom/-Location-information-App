import type {
  DailyActivity,
  FinalizedDailyActivity,
  LiveTerritoryResult,
  LocationPointInput,
  RankingEntry,
  TerritoryColor,
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
  if (lower.includes("finalized") || lower.includes("not syncable")) return new RepositoryError(message, "invalid-state");
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
  if (!startedAt || !endedAt) return "LIVE";
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
      return [];
    },
    async getRankings() {
      const profile = await ensureProfile();
      const ranking: RankingEntry = {
        id: profile.id,
        rank: 1,
        name: profile.name,
        initials: profile.initials,
        areaKm2: profile.totalAreaKm2,
        deltaKm2: 0,
        color: profile.territoryColor,
        isCurrentUser: true
      };
      return [ranking];
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
        const { data, error } = await supabase.functions.invoke("sync-live-territory", { body: { dailyActivityId } });
        if (error) throw error;
        const result = unwrapFunctionResult(data);
        return await buildLiveResult(result.dailyActivityId ?? dailyActivityId);
      } catch (error) {
        throw normalizeError(error, "テリトリーを同期できませんでした");
      }
    },
    async finalizeDailyActivity(dailyActivityId): Promise<FinalizedDailyActivity> {
      try {
        const { data, error } = await supabase.functions.invoke("finalize-daily-activity", { body: { dailyActivityId } });
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
