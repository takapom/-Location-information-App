import { createContext, useContext, useMemo } from "react";
import type { PropsWithChildren } from "react";
import { createMockTerriRepository, mockTerriRepository } from "./mockTerriRepository";
import type { TerriRepository } from "./terriRepository";
import { isSupabaseEnabled } from "@/lib/supabase/supabaseClient";
import { createSupabaseTerriRepository } from "@/lib/supabase/supabaseTerriRepository";

const RepositoryContext = createContext<TerriRepository>(mockTerriRepository);

export function RepositoryProvider({ children, repository }: PropsWithChildren<{ repository?: TerriRepository }>) {
  const resolvedRepository = useMemo(() => {
    if (repository) return repository;
    return isSupabaseEnabled() ? createSupabaseTerriRepository() : createMockTerriRepository();
  }, [repository]);

  return <RepositoryContext.Provider value={resolvedRepository}>{children}</RepositoryContext.Provider>;
}

export function useTerriRepository() {
  return useContext(RepositoryContext);
}
