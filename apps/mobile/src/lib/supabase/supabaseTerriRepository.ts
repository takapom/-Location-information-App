import type { TerriRepository } from "@/lib/repositories/terriRepository";

export function createSupabaseTerriRepository(): TerriRepository {
  throw new Error("Supabase実装はバックエンド構築後にTerriRepository interfaceへ差し込む");
}
