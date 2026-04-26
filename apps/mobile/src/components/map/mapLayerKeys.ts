import type { MapFriendMarker } from "./mapTypes";

export function buildFriendLayerKey(friends: MapFriendMarker[]) {
  return friends
    .map((friend) =>
      [
        friend.id,
        friend.initials,
        friend.displayName,
        friend.color,
        friend.isActive ? "1" : "0",
        friend.updatedLabel,
        friend.totalAreaKm2.toFixed(2),
        friend.latitude.toFixed(6),
        friend.longitude.toFixed(6)
      ].join(":")
    )
    .join("|");
}
