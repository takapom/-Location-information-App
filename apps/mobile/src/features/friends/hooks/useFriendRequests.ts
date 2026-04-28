import { useCallback, useEffect, useRef, useState } from "react";
import type { FriendPresence, FriendRequestAction, IncomingFriendRequest, OutgoingFriendRequest } from "@terri/shared";
import { useTerriRepository } from "@/lib/repositories/RepositoryProvider";

type FriendRequestsStatus = "idle" | "loading" | "success" | "error";

export function useFriendRequests() {
  const repository = useTerriRepository();
  const [incomingRequests, setIncomingRequests] = useState<IncomingFriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<OutgoingFriendRequest[]>([]);
  const [status, setStatus] = useState<FriendRequestsStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [respondingFriendshipId, setRespondingFriendshipId] = useState<string | undefined>(undefined);
  const mountedRef = useRef(false);
  const loadSequenceRef = useRef(0);

  const load = useCallback(async () => {
    const sequence = loadSequenceRef.current + 1;
    loadSequenceRef.current = sequence;
    if (mountedRef.current) {
      setStatus("loading");
      setErrorMessage(undefined);
    }
    try {
      const [incoming, outgoing] = await Promise.all([
        repository.getIncomingFriendRequests(),
        repository.getOutgoingFriendRequests()
      ]);
      if (mountedRef.current && loadSequenceRef.current === sequence) {
        setIncomingRequests(incoming);
        setOutgoingRequests(outgoing);
        setStatus("success");
      }
      return { incoming, outgoing };
    } catch (error) {
      if (mountedRef.current && loadSequenceRef.current === sequence) {
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "友達申請を読み込めませんでした");
      }
      return { incoming: [], outgoing: [] };
    }
  }, [repository]);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const respond = useCallback(
    async (friendshipId: string, action: FriendRequestAction): Promise<{ friends?: FriendPresence[] }> => {
      if (mountedRef.current) {
        setRespondingFriendshipId(friendshipId);
        setErrorMessage(undefined);
      }
      try {
        const result = await repository.respondFriendRequest(friendshipId, action);
        if (mountedRef.current) {
          setIncomingRequests((current) => current.filter((request) => request.friendshipId !== friendshipId));
        }

        if (result.status === "accepted") {
          const friends = await repository.getFriends();
          return { friends };
        }
        return {};
      } catch (error) {
        if (mountedRef.current) {
          setErrorMessage(error instanceof Error ? error.message : "友達申請を更新できませんでした");
        }
        return {};
      } finally {
        if (mountedRef.current) {
          setRespondingFriendshipId(undefined);
        }
      }
    },
    [repository]
  );

  return {
    incomingRequests,
    outgoingRequests,
    status,
    errorMessage,
    respondingFriendshipId,
    load,
    respond
  };
}
