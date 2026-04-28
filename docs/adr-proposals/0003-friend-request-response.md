# ADR Proposal 0003: 友達申請の承認/拒否を受信者スコープRPCへ閉じる

## Status

Proposed

## Context

友達ID検索と申請作成は実装済みだが、`friendships.status = 'pending'` のまま止まっている。S10の友達体験を成立させるには、受信した申請を確認し、承認または拒否できる必要がある。

既存の `friendships` は公開テーブルであり、直接updateを広く許可すると、申請した本人が自分の申請を承認する、または第三者の関係を変更する危険がある。友達関係はランキング、地図表示、現在地共有の認可境界になるため、承認/拒否はDB側で `auth.uid()` を使って受信者に限定する。

## Decision

- 受信申請一覧は `list_incoming_friend_requests()` RPCで返す。
- 送信申請一覧は `list_outgoing_friend_requests()` RPCで返す。
- 承認/拒否は `respond_friend_request(p_friendship_id, p_action)` RPCに限定する。
- `p_action` は `accept` / `reject` のみ許可する。
- `accept` は `friendships.status = 'accepted'` に更新する。
- `reject` は `friendships` 行を削除する。`blocked` は明示的な遮断であり、拒否とは別概念にする。
- 拒否後の再申請は許可する。再申請を制限する必要が出た場合は、別途ADRで `rejected` 状態やcooldownを検討する。
- 申請一覧で返すプロフィール項目は、`id`, `friend_code`, `display_name`, `avatar_url`, `territory_color`, `total_area_m2` と申請日時に限定する。
- mobile画面は `TerriRepository` の申請一覧/応答メソッドだけに依存する。
- `friendships` の直接insert/update policyは削除し、申請作成と関係変更はRPCへ寄せる。

## Consequences

- 受信者だけが申請を承認/拒否できる。
- requesterが直接 `accepted` のfriendshipを作る経路を閉じられる。
- 画面はmock/Supabaseを同じrepository契約で差し替えられる。
- rejectedを永続保存しないため、拒否履歴分析や拒否済み表示は初期MVPではできない。
- blockedは将来の明示的な遮断機能として残せる。
- 承認済み友達一覧はプロフィール最小項目を返す。ライブ現在地は引き続きPresenceで扱い、Postgresには保存しない。
