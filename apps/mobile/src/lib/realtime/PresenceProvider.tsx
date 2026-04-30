import { createContext, useContext, useMemo } from "react";
import type { PropsWithChildren } from "react";
import { createDefaultTerriPresenceClient, type TerriPresenceClient } from "./terriPresenceClient";

const PresenceContext = createContext<TerriPresenceClient | undefined>(undefined);
let fallbackClient: TerriPresenceClient | undefined;

export function PresenceProvider({ children, client }: PropsWithChildren<{ client?: TerriPresenceClient }>) {
  const resolvedClient = useMemo(() => client ?? createDefaultTerriPresenceClient(), [client]);

  return <PresenceContext.Provider value={resolvedClient}>{children}</PresenceContext.Provider>;
}

export function useTerriPresenceClient() {
  const client = useContext(PresenceContext);
  if (client) return client;
  fallbackClient ??= createDefaultTerriPresenceClient();
  return fallbackClient;
}
