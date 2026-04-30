import type { FriendLivePresencePayload } from "@terri/shared";
import { isSupabaseEnabled } from "@/lib/supabase/supabaseClient";
import { createSupabaseTerriPresenceClient } from "@/lib/supabase/supabaseTerriPresenceClient";

export type FriendPresenceUpdate = {
  friendUserId: string;
  presence?: FriendLivePresencePayload;
};

export type LivePresenceSubscription = {
  unsubscribe: () => void;
};

export interface TerriPresenceClient {
  subscribeToFriendPresence(friendUserIds: string[], onUpdate: (update: FriendPresenceUpdate) => void): LivePresenceSubscription;
  publishOwnPresence(payload: FriendLivePresencePayload): Promise<void>;
  clearOwnPresence(userId: string): Promise<void>;
}

export function createNoopTerriPresenceClient(): TerriPresenceClient {
  return {
    subscribeToFriendPresence() {
      return { unsubscribe: () => undefined };
    },
    async publishOwnPresence() {
      return undefined;
    },
    async clearOwnPresence() {
      return undefined;
    }
  };
}

export function createDefaultTerriPresenceClient(): TerriPresenceClient {
  return isSupabaseEnabled() ? createSupabaseTerriPresenceClient() : createNoopTerriPresenceClient();
}
