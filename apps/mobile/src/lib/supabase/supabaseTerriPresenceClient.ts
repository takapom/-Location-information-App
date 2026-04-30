import type { RealtimeChannel } from "@supabase/supabase-js";
import { buildFriendPresenceChannelName, latestFriendLivePresenceFromState } from "@/features/friends/services/livePresence";
import type { TerriPresenceClient } from "@/lib/realtime/terriPresenceClient";
import { getSupabaseClient } from "./supabaseClient";

type OwnChannelEntry = {
  channel: RealtimeChannel;
  ready: Promise<void>;
};

const SUBSCRIBE_TIMEOUT_MS = 5000;

export function createSupabaseTerriPresenceClient(): TerriPresenceClient {
  const supabase = getSupabaseClient();
  const ownChannels = new Map<string, OwnChannelEntry>();

  async function prepareRealtimeAuth() {
    await supabase.realtime.setAuth();
  }

  function subscribeUntilReady(channel: RealtimeChannel) {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Realtime Presence接続がタイムアウトしました")), SUBSCRIBE_TIMEOUT_MS);

      channel.subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timeout);
          resolve();
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          clearTimeout(timeout);
          reject(error ?? new Error(`Realtime Presence接続に失敗しました: ${status}`));
        }
      });
    });
  }

  async function ensureOwnChannel(userId: string) {
    const existing = ownChannels.get(userId);
    if (existing) return existing;

    await prepareRealtimeAuth();
    const channel = supabase.channel(buildFriendPresenceChannelName(userId), {
      config: {
        private: true,
        presence: {
          key: userId
        }
      }
    });
    const entry = { channel, ready: subscribeUntilReady(channel) };
    ownChannels.set(userId, entry);
    return entry;
  }

  return {
    subscribeToFriendPresence(friendUserIds, onUpdate) {
      const uniqueFriendUserIds = Array.from(new Set(friendUserIds)).filter(Boolean);
      const channels: RealtimeChannel[] = [];
      let cancelled = false;

      async function subscribe() {
        await prepareRealtimeAuth();
        if (cancelled) return;

        uniqueFriendUserIds.forEach((friendUserId) => {
          const channel = supabase
            .channel(buildFriendPresenceChannelName(friendUserId), {
              config: {
                private: true
              }
            })
            .on("presence", { event: "sync" }, () => {
              onUpdate({
                friendUserId,
                presence: latestFriendLivePresenceFromState(channel.presenceState() as Record<string, unknown>, friendUserId)
              });
            })
            .on("presence", { event: "leave" }, () => {
              onUpdate({ friendUserId, presence: undefined });
            });

          channels.push(channel);
          channel.subscribe();
        });
      }

      subscribe().catch(() => {
        uniqueFriendUserIds.forEach((friendUserId) => onUpdate({ friendUserId, presence: undefined }));
      });

      return {
        unsubscribe: () => {
          cancelled = true;
          channels.forEach((channel) => {
            supabase.removeChannel(channel);
          });
        }
      };
    },
    async publishOwnPresence(payload) {
      const entry = await ensureOwnChannel(payload.userId);
      await entry.ready;
      await entry.channel.track(payload);
    },
    async clearOwnPresence(userId) {
      const entry = ownChannels.get(userId);
      if (!entry) return;

      await entry.channel.untrack();
      await supabase.removeChannel(entry.channel);
      ownChannels.delete(userId);
    }
  };
}
