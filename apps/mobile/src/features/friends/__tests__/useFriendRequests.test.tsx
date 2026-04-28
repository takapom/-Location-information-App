import { useEffect } from "react";
import renderer, { act } from "react-test-renderer";
import type { FriendPresence } from "@terri/shared";
import { useFriendRequests } from "@/features/friends/hooks/useFriendRequests";
import { RepositoryProvider } from "@/lib/repositories/RepositoryProvider";
import { createMockTerriRepository } from "@/lib/repositories/mockTerriRepository";

type FriendRequestsHook = ReturnType<typeof useFriendRequests>;

function Probe({ onChange }: { onChange: (hook: FriendRequestsHook) => void }) {
  const hook = useFriendRequests();
  useEffect(() => {
    onChange(hook);
  }, [hook, onChange]);
  return null;
}

describe("useFriendRequests", () => {
  test("受信申請を承認すると申請一覧から消え、友達一覧を返す", async () => {
    const repository = createMockTerriRepository();
    let latest: FriendRequestsHook | undefined;

    await act(async () => {
      renderer.create(
        <RepositoryProvider repository={repository}>
          <Probe onChange={(hook) => (latest = hook)} />
        </RepositoryProvider>
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(latest?.incomingRequests).toEqual([
      expect.objectContaining({ friendshipId: "friendship-yui", requesterUserId: "yui" })
    ]);

    let acceptedFriends: FriendPresence[] | undefined;
    await act(async () => {
      acceptedFriends = (await latest?.respond("friendship-yui", "accept"))?.friends;
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(latest?.incomingRequests).toEqual([]);
    expect(acceptedFriends).toEqual(expect.arrayContaining([expect.objectContaining({ id: "yui" }), expect.objectContaining({ id: "sakura" })]));
  });

  test("送信済み申請は承認できずエラーを表示する", async () => {
    const repository = createMockTerriRepository();
    let latest: FriendRequestsHook | undefined;

    await act(async () => {
      renderer.create(
        <RepositoryProvider repository={repository}>
          <Probe onChange={(hook) => (latest = hook)} />
        </RepositoryProvider>
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    await act(async () => {
      await latest?.respond("friendship-mei", "accept");
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(latest?.errorMessage).toBe("受信した友達申請だけ操作できます");
    expect(latest?.outgoingRequests).toEqual([
      expect.objectContaining({ friendshipId: "friendship-mei", receiverUserId: "mei" })
    ]);
  });
});
