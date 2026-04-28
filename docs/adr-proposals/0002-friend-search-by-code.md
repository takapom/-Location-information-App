# ADR Proposal 0002: 友達ID検索をPostgres RPCへ閉じる

## Status

Proposed

## Context

TERRIの友達追加は、ユーザーIDで相手を検索して申請する導線が必要である。一方、`profiles` は本人プロフィールを中心にRLSで守っており、画面やmobile repositoryから任意のプロフィール一覧を直接selectさせると、公開不要な設定値や将来追加される個人情報を漏らす危険がある。

## Decision

- `profiles.friend_code` を追加し、友達検索用の安定した公開IDにする。
- 検索は `search_profiles_by_friend_code(p_query)` RPCに限定する。
- 友達申請は `request_friend_by_code(p_friend_code)` RPCに限定し、requesterはrequest bodyではなく `auth.uid()` から決める。
- RPCが返すプロフィール項目は、`id`, `friend_code`, `display_name`, `avatar_url`, `territory_color`, `total_area_m2`, `request_status` に限定する。
- mobile画面は `TerriRepository` の `searchFriendsByCode` / `requestFriendByCode` だけに依存する。

## Consequences

- RLSで通常の `profiles` selectを本人限定にしたまま、友達検索だけを公開最小面にできる。
- friend_codeの発行、重複制約、検索条件はDB migrationで運用できる。
- 将来、招待リンクやQRコード追加時も同じfriend_code契約を再利用できる。
