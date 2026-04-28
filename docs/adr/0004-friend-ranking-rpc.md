# ADR 0004: 友達ランキングを承認済み友達スコープRPCへ閉じる

## Status

Accepted

## Context

S04のランキング表示はmockでは複数ユーザーを表示できるが、Supabase実装では現在ユーザーのみを返していた。友達ランキングは友達関係を認可境界にするため、mobileから直接 `profiles` や他ユーザーの活動履歴を組み合わせると、非友達の面積やプロフィールを露出する危険がある。

ランキングは `friendships.status = 'accepted'` の相手と自分だけを対象にし、ユーザーIDはrequest bodyではなく `auth.uid()` から導く。

実装前方針は `docs/adr-proposals/0004-friend-ranking-rpc.md` に記録した。

## Decision

- 友達ランキングは `list_friend_rankings()` RPCで返す。
- RPCは `auth.uid()` がない場合に拒否する。
- 対象ユーザーは現在ユーザー本人と、`friendships.status = 'accepted'` でつながる友達だけに限定する。
- 返すプロフィール項目は `user_id`, `display_name`, `avatar_url`, `territory_color` とランキング表示に必要な面積・順位に限定する。
- 総面積は既存の面積集計と同じく `daily_activities.area_m2` の合計を使う。
- `delta_area_m2` は週次/前日比較の保存設計が未確定のため、MVPでは `0` を返す。
- 順位は `dense_rank()` で総面積の降順に決め、同面積では表示名順で安定させる。
- mobile画面は引き続き `TerriRepository.getRankings()` だけに依存し、Supabase RPCの形を直接知らない。

## Consequences

- 非友達のランキング情報を返す経路を作らずに、S04のランキング表示をSupabaseへ接続できる。
- mockとSupabaseのランキング契約は `RankingEntry` のまま維持できる。
- `deltaKm2` は初期MVPでは常に0になる。増減表示を正確に出すには、日次または週次のランキングスナップショット設計が必要になる。
- `daily_activities.area_m2` を正とするため、将来 `territories(state='final')` をランキングの正にする場合は別ADRで切り替える。

## Impact

- Mobile:
  - `supabaseTerriRepository.getRankings()` を `list_friend_rankings()` RPCへ接続した。
  - RPC rowから `RankingEntry` へ変換するmapperを追加した。

- Supabase:
  - `supabase/migrations/0008_friend_rankings.sql` を追加した。
  - `list_friend_rankings()` は `auth.uid()`、accepted friendship、本人スコープをDB側で強制する。

- Test:
  - SQL contract testに認証、accepted friend限定、self included、grantの検証を追加した。
  - Supabase repository mapper testにランキング行変換を追加した。
  - mock repository contract testにランキング契約の維持を追加した。

## Notes

- 作成日: 2026-04-28
- 関連ADR:
  - `docs/adr/0003-friend-request-response.md`
- 関連ファイル:
  - `docs/architecture.md`
  - `apps/mobile/src/lib/repositories/terriRepository.ts`
  - `apps/mobile/src/lib/repositories/mockTerriRepository.ts`
  - `apps/mobile/src/lib/supabase/supabaseTerriRepository.ts`
  - `supabase/migrations/0008_friend_rankings.sql`
