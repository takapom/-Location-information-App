import type { FriendPresence } from "@terri/shared";

export const FRIEND_PRESENCE_OFFLINE_AFTER_MINUTES = 30;

export function getVisibleFriendPresences(friends: FriendPresence[]) {
  return friends.filter((friend) => friend.locationSharingEnabled);
}

export function isFriendPresenceOnline(friend: FriendPresence, now = new Date()) {
  const updatedAtMs = Date.parse(friend.updatedAt);
  if (!Number.isFinite(updatedAtMs)) {
    return false;
  }

  return now.getTime() - updatedAtMs < FRIEND_PRESENCE_OFFLINE_AFTER_MINUTES * 60 * 1000;
}

export function getActiveFriendPresenceCount(friends: FriendPresence[], now = new Date()) {
  return getVisibleFriendPresences(friends).filter((friend) => friend.isActive && isFriendPresenceOnline(friend, now)).length;
}

export function formatPresenceUpdatedAt(friend: FriendPresence, now = new Date()) {
  if (!friend.locationSharingEnabled) {
    return "共有OFF";
  }

  const updatedAtMs = Date.parse(friend.updatedAt);
  if (!Number.isFinite(updatedAtMs)) {
    return "更新時刻不明";
  }

  const diffMinutes = Math.max(0, Math.floor((now.getTime() - updatedAtMs) / 60000));
  if (diffMinutes < 1) {
    return "今";
  }

  if (diffMinutes >= FRIEND_PRESENCE_OFFLINE_AFTER_MINUTES) {
    return "オフライン";
  }

  return `${diffMinutes}分前`;
}
