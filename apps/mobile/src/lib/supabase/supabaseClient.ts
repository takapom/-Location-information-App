import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type TerriDataSource = "mock" | "supabase";

type SupabaseConfig = {
  url?: string;
  anonKey?: string;
  dataSource: TerriDataSource;
};

type StorageLike = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
};

const memoryStorage = new Map<string, string>();

const fallbackStorage: StorageLike = {
  getItem: (key) => memoryStorage.get(key) ?? null,
  setItem: (key, value) => {
    memoryStorage.set(key, value);
  },
  removeItem: (key) => {
    memoryStorage.delete(key);
  }
};

let client: SupabaseClient | undefined;

function readEnv(name: string) {
  return process.env[name];
}

export function getSupabaseConfig(): SupabaseConfig {
  const url = readEnv("EXPO_PUBLIC_SUPABASE_URL") || "http://127.0.0.1:54321";
  const anonKey = readEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  const explicitSource = readEnv("EXPO_PUBLIC_TERRI_DATA_SOURCE");
  const dataSource: TerriDataSource = explicitSource === "mock" ? "mock" : explicitSource === "supabase" || anonKey ? "supabase" : "mock";

  return { url, anonKey, dataSource };
}

export function isSupabaseEnabled() {
  const config = getSupabaseConfig();
  return config.dataSource === "supabase" && Boolean(config.url && config.anonKey);
}

function getAuthStorage(): StorageLike {
  const maybeLocalStorage = (globalThis as { localStorage?: StorageLike }).localStorage;
  return AsyncStorage ?? maybeLocalStorage ?? fallbackStorage;
}

export function getSupabaseClient() {
  if (client) return client;

  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    throw new Error("EXPO_PUBLIC_SUPABASE_URL と EXPO_PUBLIC_SUPABASE_ANON_KEY を設定してください");
  }

  client = createClient(config.url, config.anonKey, {
    auth: {
      storage: getAuthStorage(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  });

  return client;
}
