# ADR Proposal 0007: 友達ライブ現在地をUser Scoped Private Presenceで配信する

## Status

Proposed

## Context

友達一覧、友達ランキング、友達の確定済み陣地表示は実装済みだが、S04メインマップ上の友達マーカーはRealtime Presenceへ接続していない。

友達現在地は履歴資産ではなく、鮮度が価値の短期状態である。Postgresに最新位置テーブルや履歴テーブルを作ると、保存範囲とRLS設計が重くなり、既存の「友達のライブ現在地履歴は保存しない」方針に反する。

## Decision

- 友達ライブ現在地はSupabase Realtime Presenceで扱い、Postgresには保存しない。
- チャンネルは `presence:user:{userId}` とする。
- 本人は自分のチャンネルにだけPresenceをtrackできる。
- 承認済み友達は相手のチャンネルをsubscribeできる。
- private channel authorizationとして `realtime.messages` にPresence専用RLS policyを追加する。
- `location_sharing_enabled = false` の場合、mobileはPresenceを送らず、可能な範囲で既存Presenceをuntrackする。
- Presence payloadは `userId`, `position`, `updatedAt`, `isActive`, `locationSharingEnabled` を中心にし、表示名や色は承認済み友達一覧のプロフィールを正とする。
- 30分以上更新がないPresenceはmobile側でoffline扱いにする。
- 送信はtracking workflowの責務、購読はfriends featureの責務、描画は `MapSurface` propsだけの責務とする。

## Impact

- Shared contract:
  - `FriendLivePresencePayload`

- Mobile:
  - `apps/mobile/src/lib/realtime/` にPresence client interfaceとSupabase/noop実装を置く。
  - `apps/mobile/src/features/friends/hooks/useFriendLivePresence.ts` で承認済み友達のPresenceを購読し、友達一覧とmergeする。
  - `apps/mobile/src/features/tracking/hooks/useLiveTerritory.ts` は現在地更新時にPresenceを15秒間隔で送る。
  - `HomeMapScreen` はmerge済み友達をMapSurface/FriendsModalへ渡す。

- Supabase:
  - `supabase/migrations/0010_friend_live_presence_realtime.sql` を追加する。
  - 現在地保存用tableは追加しない。

- Test:
  - Presence payload shape、共有OFFで送らない、30分TTL、merge挙動をunit testする。
  - hookで購読開始、Presence反映、非友達payload無視をtestする。
  - SQL contractで `realtime.messages` policy、`presence:user:` topic、accepted friendship条件、本人のみinsert条件を検証する。

## Consequences

- 友達現在地を履歴として保存せずにS04地図へ反映できる。
- private channelのRLSにより、非友達が友達現在地channelを購読する経路を閉じられる。
- Presenceは切断時に消えるため、アプリ再起動直後は相手が再送するまで表示されない場合がある。MVPでは30分TTLと未接続時非表示で扱う。
