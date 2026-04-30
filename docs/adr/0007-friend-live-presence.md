# ADR 0007: 友達ライブ現在地をUser Scoped Private Presenceで配信する

## Status

Accepted

## Context

友達一覧、友達ランキング、友達の確定済み陣地表示は実装済みだが、S04メインマップ上の友達マーカーはRealtime Presenceへ接続していなかった。

友達現在地は履歴資産ではなく、鮮度が価値の短期状態である。Postgresに最新位置テーブルや履歴テーブルを作ると、保存範囲とRLS設計が重くなり、既存の「友達のライブ現在地履歴は保存しない」方針に反する。

実装前方針は `docs/adr-proposals/0007-friend-live-presence.md` に記録した。

## Decision

- 友達ライブ現在地はSupabase Realtime Presenceで扱い、Postgresには保存しない。
- チャンネルは `presence:user:{userId}` とする。
- Realtime channelはprivate channelにし、`realtime.messages` のRLS policyで認可する。
- 本人は自分のチャンネルにだけPresenceをtrackできる。
- 本人または `friendships.status = 'accepted'` の友達だけが対象チャンネルをsubscribeできる。
- `location_sharing_enabled = false` の場合、mobileはPresenceを送らず、可能な範囲で既存Presenceをuntrackする。
- Presence payloadは `userId`, `position`, `updatedAt`, `isActive`, `locationSharingEnabled`, `accuracyM` に限定する。
- 表示名、色、総面積はPresence payloadではなく `list_accepted_friends()` のプロフィール一覧を正とする。
- 30分以上更新がないPresenceはmobile側でoffline扱いにする。
- 送信はtracking workflow、購読はfriends feature、描画は `MapSurface` propsの責務とする。

## Consequences

- 友達現在地を履歴として保存せずにS04地図へ反映できる。
- private channelのRLSにより、非友達が友達現在地channelを購読する経路を閉じられる。
- Presenceは切断時に消えるため、アプリ再起動直後は相手が再送するまで表示されない場合がある。MVPでは30分TTLと未接続時非表示で扱う。
- Realtime authorizationはSupabase Realtimeのprivate channel仕様に依存するため、local/remote Supabaseへのmigration反映時に `realtime.messages` policyも確認する。

## Impact

- Shared contract:
  - `FriendLivePresencePayload`

- Mobile:
  - `apps/mobile/src/lib/realtime/terriPresenceClient.ts`
  - `apps/mobile/src/lib/realtime/PresenceProvider.tsx`
  - `apps/mobile/src/lib/supabase/supabaseTerriPresenceClient.ts`
  - `apps/mobile/src/features/friends/services/livePresence.ts`
  - `apps/mobile/src/features/friends/hooks/useFriendLivePresence.ts`
  - `apps/mobile/src/features/tracking/hooks/useLiveTerritory.ts`
  - `apps/mobile/src/features/map/components/HomeMapScreen.tsx`

- Supabase:
  - `supabase/migrations/0010_friend_live_presence_realtime.sql`
  - 現在地保存用tableは追加しない。

- Test:
  - Presence payload、共有OFF、15秒送信間隔、presenceState parsingをunit testした。
  - friend live presence hookの購読、反映、解除をtestした。
  - SQL contractで `realtime.messages` policy、`presence:user:` topic、accepted friendship条件、本人のみinsert条件を検証した。

## Notes

- 作成日: 2026-04-29
- 関連ADR:
  - `docs/adr/0001-continuous-territory-capture.md`
  - `docs/adr/0003-friend-request-response.md`
  - `docs/adr/0006-zenly-style-map-engine.md`
- `docs/architecture.md` のリアルタイム現在地、Mobile UI構造、privacy policyを更新した。
