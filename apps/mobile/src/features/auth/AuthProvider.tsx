import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseEnabled } from "@/lib/supabase/supabaseClient";

type AuthContextValue = {
  enabled: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  errorMessage?: string;
  signInWithPassword: (input: { email: string; password: string }) => Promise<void>;
  signUpWithPassword: (input: { email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const enabled = isSupabaseEnabled();
  const [loading, setLoading] = useState(enabled);
  const [session, setSession] = useState<Session | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setSession(null);
      return;
    }

    const supabase = getSupabaseClient();
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        setSession(data.session ?? null);
        setErrorMessage(error?.message);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : "セッションを確認できませんでした");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setErrorMessage(undefined);
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [enabled]);

  const signInWithPassword = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      if (!enabled) return;
      setLoading(true);
      setErrorMessage(undefined);
      try {
        const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
        setSession(data.session ?? null);
        if (error) {
          setErrorMessage(error.message);
          throw error;
        }
      } finally {
        setLoading(false);
      }
    },
    [enabled]
  );

  const signUpWithPassword = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      if (!enabled) return;
      setLoading(true);
      setErrorMessage(undefined);
      try {
        const { data, error } = await getSupabaseClient().auth.signUp({ email, password });
        setSession(data.session ?? null);
        if (error) {
          setErrorMessage(error.message);
          throw error;
        }
      } finally {
        setLoading(false);
      }
    },
    [enabled]
  );

  const signOut = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const { error } = await getSupabaseClient().auth.signOut();
      setSession(null);
      if (error) {
        setErrorMessage(error.message);
        throw error;
      }
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  const value = useMemo<AuthContextValue>(
    () => ({
      enabled,
      loading,
      session,
      user: session?.user ?? null,
      errorMessage,
      signInWithPassword,
      signUpWithPassword,
      signOut
    }),
    [enabled, errorMessage, loading, session, signInWithPassword, signOut, signUpWithPassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
