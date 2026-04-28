# ADR 0002: 友達ID検索をPostgres RPCへ閉じる

## Status

Accepted

## Context

友達追加では、ユーザーIDで相手を検索して申請する必要がある。`profiles` を広くselect可能にすると、公開不要なプロフィール設定や将来の個人情報を漏らすリスクがあるため、検索専用の公開面をDB関数で定義する。

## Decision

- `profiles.friend_code` を追加し、lower-case unique indexで重複を防ぐ。
- `search_profiles_by_friend_code(p_query)` は認証済みユーザーだけが実行できる `security definer` RPCにする。
- 検索結果は公開最小項目と `request_status` のみに限定し、自分自身とblocked関係は返さない。
- `request_friend_by_code(p_friend_code)` は `auth.uid()` をrequesterとして `friendships` を作成する。body由来のuser_idは受け取らない。
- mobileは `TerriRepository` に `searchFriendsByCode` / `requestFriendByCode` を追加し、mock/Supabaseを同じ契約に揃える。

## Consequences

- 画面はSupabase clientを直接importせず、repository境界を維持できる。
- `profiles` RLSは本人selectのままで、検索RPCだけが公開プロフィールの出口になる。
- 友達検索UI、mock repository、Supabase repository、SQL contract testを同じ契約で検証できる。
