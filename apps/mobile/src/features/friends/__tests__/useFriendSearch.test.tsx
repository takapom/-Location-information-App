import { useEffect } from "react";
import renderer, { act } from "react-test-renderer";
import type { FriendSearchResult } from "@terri/shared";
import { colors } from "@/theme/tokens";
import { useFriendSearch } from "@/features/friends/hooks/useFriendSearch";
import { RepositoryProvider } from "@/lib/repositories/RepositoryProvider";
import { createMockTerriRepository } from "@/lib/repositories/mockTerriRepository";

type FriendSearchHook = ReturnType<typeof useFriendSearch>;

function createDeferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

const riku: FriendSearchResult = {
  id: "riku",
  friendCode: "RIKU2026",
  displayName: "Riku",
  initials: "R",
  color: colors.yellow,
  totalAreaKm2: 0.4,
  requestStatus: "none"
};

const mei: FriendSearchResult = {
  id: "mei",
  friendCode: "MEI333",
  displayName: "Mei",
  initials: "M",
  color: colors.pink,
  totalAreaKm2: 2.1,
  requestStatus: "none"
};

function Probe({ onChange }: { onChange: (hook: FriendSearchHook) => void }) {
  const hook = useFriendSearch();
  useEffect(() => {
    onChange(hook);
  }, [hook, onChange]);
  return null;
}

describe("useFriendSearch", () => {
  test("古い検索レスポンスで最新結果を上書きしない", async () => {
    const repository = createMockTerriRepository();
    const pending = new Map<string, ReturnType<typeof createDeferred<FriendSearchResult[]>>>();
    repository.searchFriendsByCode = jest.fn((query: string) => {
      const deferred = createDeferred<FriendSearchResult[]>();
      pending.set(query, deferred);
      return deferred.promise;
    });

    let latest: FriendSearchHook | undefined;
    await act(async () => {
      renderer.create(
        <RepositoryProvider repository={repository}>
          <Probe onChange={(hook) => (latest = hook)} />
        </RepositoryProvider>
      );
    });

    await act(async () => {
      void latest?.search("RI");
      void latest?.search("ME");
    });

    await act(async () => {
      pending.get("ME")?.resolve([mei]);
      await Promise.resolve();
    });

    expect(latest?.results).toEqual([mei]);

    await act(async () => {
      pending.get("RI")?.resolve([riku]);
      await Promise.resolve();
    });

    expect(latest?.results).toEqual([mei]);
  });
});
