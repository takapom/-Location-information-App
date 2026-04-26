import { createContext, useContext, useMemo } from "react";
import type { PropsWithChildren } from "react";
import { createMockTerriRepository, mockTerriRepository } from "./mockTerriRepository";
import type { TerriRepository } from "./terriRepository";

const RepositoryContext = createContext<TerriRepository>(mockTerriRepository);

export function RepositoryProvider({ children, repository }: PropsWithChildren<{ repository?: TerriRepository }>) {
  const resolvedRepository = useMemo(() => repository ?? createMockTerriRepository(), [repository]);

  return <RepositoryContext.Provider value={resolvedRepository}>{children}</RepositoryContext.Provider>;
}

export function useTerriRepository() {
  return useContext(RepositoryContext);
}
