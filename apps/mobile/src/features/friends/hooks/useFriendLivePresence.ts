import { useEffect, useMemo, useState } from "react";
import type { FriendLivePresencePayload, FriendPresence } from "@terri/shared";
import { useTerriPresenceClient } from "@/lib/realtime/PresenceProvider";
import { mergeFriendsWithLivePresence } from "@/features/friends/services/livePresence";

export function useFriendLivePresence(friends: FriendPresence[]) {
  const presenceClient = useTerriPresenceClient();
  const [presences, setPresences] = useState<Record<string, FriendLivePresencePayload | undefined>>({});
  const friendIdsKey = useMemo(() => friends.map((friend) => friend.id).sort().join("|"), [friends]);

  useEffect(() => {
    const friendIds = friends.filter((friend) => friend.locationSharingEnabled).map((friend) => friend.id);
    setPresences((current) => Object.fromEntries(Object.entries(current).filter(([friendId]) => friendIds.includes(friendId))));

    if (friendIds.length === 0) return undefined;

    const subscription = presenceClient.subscribeToFriendPresence(friendIds, (update) => {
      setPresences((current) => ({
        ...current,
        [update.friendUserId]: update.presence
      }));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [friendIdsKey, friends, presenceClient]);

  return useMemo(() => mergeFriendsWithLivePresence(friends, presences), [friends, presences]);
}
