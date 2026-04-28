# ADR 0003: 友達申請の承認/拒否を受信者スコープRPCへ閉じる

## Status

Accepted

## Context

友達ID検索と申請作成は実装済みだが、`friendships.status = 'pending'` のまま止まっていた。S10の友達体験を成立させるには、受信した申請を確認し、承認または拒否できる必要がある。

既存の `friendships` は公開テーブルであり、直接updateを広く許可すると、申請した本人が自分の申請を承認する、または第三者の関係を変更する危険がある。友達関係はランキング、地図表示、現在地共有の認可境界になるため、承認/拒否はDB側で `auth.uid()` を使って受信者に限定する。

実装前方針は `docs/adr-proposals/0003-friend-request-response.md` に記録した。

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
- 承認済み友達一覧は `list_accepted_friends()` RPCで公開最小プロフィールを返す。ライブ現在地は引き続きPresenceで扱い、Postgresには保存しない。

## Consequences

- 受信者だけが申請を承認/拒否できる。
- requesterが直接 `accepted` のfriendshipを作る経路を閉じられる。
- 画面はmock/Supabaseを同じrepository契約で差し替えられる。
- rejectedを永続保存しないため、拒否履歴分析や拒否済み表示は初期MVPではできない。
- blockedは将来の明示的な遮断機能として残せる。
- 承認済み友達のプロフィール一覧は取得できるが、現在地がない友達は地図マーカーには出さない。

## Impact

- Shared contract:
  - `FriendRequest`
  - `IncomingFriendRequest`
  - `OutgoingFriendRequest`
  - `FriendRequestActionResult`

- Mobile:
  - `TerriRepository` に申請一覧/応答メソッドを追加した。
  - `mockTerriRepository` と `supabaseTerriRepository` に同じ契約を実装した。
  - `useFriendRequests` を追加した。
  - `FriendsModal` に届いた申請と申請中の表示、承認/拒否ボタンを追加した。
  - `FriendPresence.position` を任意にし、現在地がない承認済み友達は一覧には出せるが地図マーカーには出さない。

- Supabase:
  - `supabase/migrations/0007_friend_request_response.sql` を追加した。
  - `friendships_insert_requester` / `friendships_update_participant` policyを削除した。
  - `list_incoming_friend_requests`, `list_outgoing_friend_requests`, `list_accepted_friends`, `respond_friend_request` を追加した。

- Test:
  - mock repository contract testに承認、拒否、送信者による自己承認拒否を追加した。
  - hook/UI testに承認後の表示更新を追加した。
  - SQL contract testに受信者限定RPCと直接update policy削除の検証を追加した。

## Notes

- 作成日: 2026-04-28
- 関連ADR:
  - `docs/adr/0002-friend-search-by-code.md`
- 関連ファイル:
  - `docs/architecture.md`
  - `packages/shared/src/index.ts`
  - `apps/mobile/src/lib/repositories/terriRepository.ts`
  - `apps/mobile/src/lib/repositories/mockTerriRepository.ts`
  - `apps/mobile/src/lib/supabase/supabaseTerriRepository.ts`
  - `apps/mobile/src/features/friends/hooks/useFriendRequests.ts`
  - `apps/mobile/src/features/map/components/FriendsModal.tsx`
  - `supabase/migrations/0007_friend_request_response.sql`
