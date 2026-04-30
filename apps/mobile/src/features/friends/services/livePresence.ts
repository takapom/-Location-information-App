import type { FriendLivePresencePayload, FriendPresence, GeoPoint, UserProfile } from "@terri/shared";

export const FRIEND_PRESENCE_CHANNEL_PREFIX = "presence:user:";
export const FRIEND_PRESENCE_PUBLISH_INTERVAL_MS = 15_000;

type CurrentPresenceLocation = GeoPoint & {
  accuracyM?: number;
  recordedAt: string;
};

export function buildFriendPresenceChannelName(userId: string) {
  return `${FRIEND_PRESENCE_CHANNEL_PREFIX}${userId}`;
}

export function createFriendLivePresencePayload(input: {
  profile: UserProfile;
  currentLocation: CurrentPresenceLocation;
  isActive: boolean;
}): FriendLivePresencePayload | undefined {
  if (!input.profile.locationSharingEnabled) return undefined;

  return {
    userId: input.profile.id,
    position: {
      latitude: input.currentLocation.latitude,
      longitude: input.currentLocation.longitude
    },
    updatedAt: input.currentLocation.recordedAt,
    isActive: input.isActive,
    locationSharingEnabled: true,
    accuracyM: input.currentLocation.accuracyM
  };
}

export function shouldPublishFriendLivePresence(input: {
  lastPublishedAtMs?: number;
  nowMs: number;
  force?: boolean;
}) {
  if (input.force) return true;
  return input.lastPublishedAtMs === undefined || input.nowMs - input.lastPublishedAtMs >= FRIEND_PRESENCE_PUBLISH_INTERVAL_MS;
}

export function mergeFriendsWithLivePresence(
  friends: FriendPresence[],
  presences: Record<string, FriendLivePresencePayload | undefined>
): FriendPresence[] {
  return friends.map((friend) => {
    const presence = presences[friend.id];
    if (!presence) return friend;
    if (presence.userId !== friend.id || !presence.locationSharingEnabled) {
      return {
        ...friend,
        isActive: false,
        locationSharingEnabled: false,
        position: undefined,
        updatedAt: presence.updatedAt
      };
    }

    return {
      ...friend,
      isActive: presence.isActive,
      locationSharingEnabled: friend.locationSharingEnabled && presence.locationSharingEnabled,
      position: { ...presence.position },
      updatedAt: presence.updatedAt
    };
  });
}

export function parseFriendLivePresencePayload(value: unknown, expectedUserId?: string): FriendLivePresencePayload | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<FriendLivePresencePayload>;
  if (typeof candidate.userId !== "string") return undefined;
  if (expectedUserId && candidate.userId !== expectedUserId) return undefined;
  if (typeof candidate.updatedAt !== "string" || Number.isNaN(Date.parse(candidate.updatedAt))) return undefined;
  if (typeof candidate.isActive !== "boolean") return undefined;
  if (typeof candidate.locationSharingEnabled !== "boolean") return undefined;
  if (!candidate.position || typeof candidate.position !== "object") return undefined;

  const position = candidate.position as Partial<GeoPoint>;
  if (typeof position.latitude !== "number" || typeof position.longitude !== "number") return undefined;
  if (!Number.isFinite(position.latitude) || !Number.isFinite(position.longitude)) return undefined;
  if (Math.abs(position.latitude) > 90 || Math.abs(position.longitude) > 180) return undefined;

  return {
    userId: candidate.userId,
    position: {
      latitude: position.latitude,
      longitude: position.longitude
    },
    updatedAt: candidate.updatedAt,
    isActive: candidate.isActive,
    locationSharingEnabled: candidate.locationSharingEnabled,
    accuracyM: typeof candidate.accuracyM === "number" && Number.isFinite(candidate.accuracyM) ? candidate.accuracyM : undefined
  };
}

export function latestFriendLivePresenceFromState(
  state: Record<string, unknown>,
  expectedUserId: string
): FriendLivePresencePayload | undefined {
  const candidates = Object.values(state)
    .flatMap((entry) => (Array.isArray(entry) ? entry : []))
    .map((entry) => parseFriendLivePresencePayload(entry, expectedUserId))
    .filter((entry): entry is FriendLivePresencePayload => Boolean(entry))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  return candidates[0];
}
