import { useCallback, useRef, useState } from "react";
import type { FriendSearchResult } from "@terri/shared";
import { useTerriRepository } from "@/lib/repositories/RepositoryProvider";

type FriendSearchStatus = "idle" | "loading" | "success" | "error";

export function useFriendSearch() {
  const repository = useTerriRepository();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FriendSearchResult[]>([]);
  const [status, setStatus] = useState<FriendSearchStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [requestingFriendCode, setRequestingFriendCode] = useState<string | undefined>(undefined);
  const searchSequenceRef = useRef(0);

  const search = useCallback(
    async (nextQuery = query) => {
      const normalizedQuery = nextQuery.trim();
      setQuery(nextQuery);
      setErrorMessage(undefined);

      if (normalizedQuery.length < 2) {
        searchSequenceRef.current += 1;
        setResults([]);
        setStatus("idle");
        return [];
      }

      const searchSequence = searchSequenceRef.current + 1;
      searchSequenceRef.current = searchSequence;
      setStatus("loading");
      try {
        const nextResults = await repository.searchFriendsByCode(normalizedQuery);
        if (searchSequenceRef.current === searchSequence) {
          setResults(nextResults);
          setStatus("success");
        }
        return nextResults;
      } catch (error) {
        if (searchSequenceRef.current === searchSequence) {
          setResults([]);
          setStatus("error");
          setErrorMessage(error instanceof Error ? error.message : "友達を検索できませんでした");
        }
        return [];
      }
    },
    [query, repository]
  );

  const requestFriend = useCallback(
    async (friendCode: string) => {
      setRequestingFriendCode(friendCode);
      setErrorMessage(undefined);
      try {
        const request = await repository.requestFriendByCode(friendCode);
        setResults((currentResults) =>
          currentResults.map((result) =>
            result.friendCode === friendCode
              ? {
                  ...result,
                  requestStatus: request.status
                }
              : result
          )
        );
        return request;
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "友達申請を送れませんでした");
        return undefined;
      } finally {
        setRequestingFriendCode(undefined);
      }
    },
    [repository]
  );

  return {
    query,
    setQuery,
    results,
    status,
    errorMessage,
    requestingFriendCode,
    search,
    requestFriend
  };
}
