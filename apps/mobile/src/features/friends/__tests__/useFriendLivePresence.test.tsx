import renderer, { act } from "react-test-renderer";
import type { FriendLivePresencePayload, FriendPresence } from "@terri/shared";
import { useFriendLivePresence } from "@/features/friends/hooks/useFriendLivePresence";
import { PresenceProvider } from "@/lib/realtime/PresenceProvider";
import type { FriendPresenceUpdate, TerriPresenceClient } from "@/lib/realtime/terriPresenceClient";
import { colors } from "@/theme/tokens";

const friend: FriendPresence = {
  id: "friend-1",
  displayName: "Sakura",
  initials: "S",
  color: colors.coral,
  totalAreaKm2: 1.5,
  isActive: false,
  updatedAt: "2026-04-29T00:00:00.000Z",
  locationSharingEnabled: true
};

const presence: FriendLivePresencePayload = {
  userId: "friend-1",
  position: { latitude: 35.66, longitude: 139.7 },
  updatedAt: "2026-04-29T01:00:00.000Z",
  isActive: true,
  locationSharingEnabled: true
};

function Probe({ friends, onChange }: { friends: FriendPresence[]; onChange: (friends: FriendPresence[]) => void }) {
  const liveFriends = useFriendLivePresence(friends);
  onChange(liveFriends);
  return null;
}

function createPresenceClient() {
  const unsubscribe = jest.fn();
  let onUpdate: ((update: FriendPresenceUpdate) => void) | undefined;
  const client: TerriPresenceClient = {
    subscribeToFriendPresence: jest.fn((_friendUserIds, nextOnUpdate) => {
      onUpdate = nextOnUpdate;
      return { unsubscribe };
    }),
    publishOwnPresence: jest.fn(async () => undefined),
    clearOwnPresence: jest.fn(async () => undefined)
  };

  return {
    client,
    unsubscribe,
    emit: (update: FriendPresenceUpdate) => onUpdate?.(update)
  };
}

describe("useFriendLivePresence", () => {
  test("承認済み友達のPresenceを購読して友達一覧へ反映する", () => {
    const harness = createPresenceClient();
    let latest: FriendPresence[] = [];

    act(() => {
      renderer.create(
        <PresenceProvider client={harness.client}>
          <Probe friends={[friend]} onChange={(friends) => (latest = friends)} />
        </PresenceProvider>
      );
    });

    expect(harness.client.subscribeToFriendPresence).toHaveBeenCalledWith(["friend-1"], expect.any(Function));

    act(() => {
      harness.emit({ friendUserId: "friend-1", presence });
    });

    expect(latest[0]).toMatchObject({
      id: "friend-1",
      isActive: true,
      updatedAt: "2026-04-29T01:00:00.000Z",
      position: { latitude: 35.66, longitude: 139.7 }
    });
  });

  test("共有OFFの友達は購読対象にしない", () => {
    const harness = createPresenceClient();

    act(() => {
      renderer.create(
        <PresenceProvider client={harness.client}>
          <Probe friends={[{ ...friend, locationSharingEnabled: false }]} onChange={jest.fn()} />
        </PresenceProvider>
      );
    });

    expect(harness.client.subscribeToFriendPresence).not.toHaveBeenCalled();
  });

  test("購読解除時にRealtime subscriptionを解除する", () => {
    const harness = createPresenceClient();
    let tree: renderer.ReactTestRenderer | undefined;

    act(() => {
      tree = renderer.create(
        <PresenceProvider client={harness.client}>
          <Probe friends={[friend]} onChange={jest.fn()} />
        </PresenceProvider>
      );
    });

    act(() => {
      tree?.unmount();
    });

    expect(harness.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
