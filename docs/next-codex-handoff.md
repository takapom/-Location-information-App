# TERRI Next Codex Handoff

## 現在の状態

最終作業commit:

```text
34fdd4a feat: refine zenly style map surface
```

Supabase反映:

- local Supabase:
  - DB migration `0001` から `0011` まで適用済み
  - `list_incoming_friend_requests`
  - `list_outgoing_friend_requests`
  - `list_accepted_friends`
  - `respond_friend_request`
  - `list_friend_rankings`
  - `list_friend_territories`
- remote Supabase:
  - 直近の友達申請/ランキング/友達陣地/Presence/ranking delta実装はremoteへ適用していない
  - 以降の作業も、明示がない限りlocalに納める

動作確認:

- Expo dev server起動確認済み
  - Web: `http://localhost:8081`
  - Metro: `exp://127.0.0.1:8081`
- S04でランキングUIの実データ表示確認済み
- local Supabase上で同面積ユーザーが同じrankになることを確認済み
- 友達ライブ現在地Presence実装はTypeScript/Jest/SQL contractで確認済み

## 重要な設計前提

- 実装判断は `docs/architecture.md` を優先する。
- アーキテクチャ変更時は `docs/architecture.md` とADRを更新する。
- ADR運用は `docs/ADR運用.md` に従う。
- UI/UXはS04メインマップ中心。タブ型ダッシュボードに寄せない。
- 画面からSupabaseを直接呼ばない。必ず `TerriRepository` を通す。
- `user_id` はrequest bodyを信用せず、DB/RPC側で `auth.uid()` から導く。
- 友達のライブ現在地履歴は保存しない。
- 確定済み陣地とlive previewを混同しない。
- GPS、auth、privacy、territory、friendship認可はnegative testを必須にする。

関連ADR:

- `docs/adr/0001-continuous-territory-capture.md`
- `docs/adr/0002-friend-search-by-code.md`
- `docs/adr/0003-friend-request-response.md`
- `docs/adr/0004-friend-ranking-rpc.md`
- `docs/adr/0005-friend-territories-rpc.md`
- `docs/adr/0006-zenly-style-map-engine.md`
- `docs/adr/0007-friend-live-presence.md`
- `docs/adr/0008-ranking-delta-snapshots.md`
- `docs/adr/0009-native-maplibre-map-surface.md`

## 実装済み内容

### 1. 継続トラッキング

主なファイル:

- `apps/mobile/src/features/tracking/hooks/useLiveTerritory.ts`
- `apps/mobile/src/features/tracking/services/locationWatcher.ts`
- `apps/mobile/src/features/tracking/services/trackingPolicy.ts`
- `apps/mobile/src/features/tracking/services/locationReader.ts`
- `supabase/migrations/0005_live_territory_functions.sql`

内容:

- foreground watcherで位置情報を継続購読。
- GPS点保存は `accuracy < 50m` かつ `5秒経過 or 10m移動`。
- 保存されたGPS点がある場合だけ、30秒以上の間隔で `sync_live_territory` を自動実行。
- 手動同期は30秒制限とは独立。
- `sync_live_territory` は `territories(state='live')` をupsertする。
- `finalize_daily_activity` は `territories(state='final')` を保存する。
- watcher解除、reset、permission denied時の停止を実装済み。

### 2. 友達ID検索

主なファイル:

- `supabase/migrations/0006_friend_search.sql`
- `apps/mobile/src/features/friends/hooks/useFriendSearch.ts`
- `apps/mobile/src/features/map/components/FriendsModal.tsx`
- `apps/mobile/src/lib/repositories/terriRepository.ts`
- `apps/mobile/src/lib/repositories/mockTerriRepository.ts`
- `apps/mobile/src/lib/supabase/supabaseTerriRepository.ts`
- `packages/shared/src/index.ts`

内容:

- `profiles.friend_code` を追加。
- `search_profiles_by_friend_code(p_query)` を追加。
- `request_friend_by_code(p_friend_code)` を追加。
- search RPCは公開してよい最小プロフィールだけ返す。
- request RPCは `auth.uid()` をrequesterにして `friendships` を作る。
- blocked関係と自分自身は検索/申請対象から除外。
- mobile側は `TerriRepository` の `searchFriendsByCode` / `requestFriendByCode` 経由。
- 古い検索レスポンスが新しい検索結果を上書きしないよう、hookで世代管理済み。

### 3. 友達申請の承認/拒否

主なファイル:

- `supabase/migrations/0007_friend_request_response.sql`
- `apps/mobile/src/features/friends/hooks/useFriendRequests.ts`
- `apps/mobile/src/features/map/components/FriendsModal.tsx`
- `apps/mobile/src/lib/repositories/terriRepository.ts`
- `apps/mobile/src/lib/repositories/mockTerriRepository.ts`
- `apps/mobile/src/lib/supabase/supabaseTerriRepository.ts`
- `packages/shared/src/index.ts`

内容:

- `list_incoming_friend_requests()` を追加。
- `list_outgoing_friend_requests()` を追加。
- `list_accepted_friends()` を追加。
- `respond_friend_request(p_friendship_id, p_action)` を追加。
- `accept` は `friendships.status = 'accepted'` に更新する。
- `reject` はpending friendship行を削除する。
- 受信者だけがpending申請を承認/拒否できる。
- `friendships` の直接insert/update policyは削除済み。
- 承認済み友達一覧はプロフィール最小項目を返す。ライブ現在地はPresenceで別途扱う。

### 4. 友達ランキング

主なファイル:

- `supabase/migrations/0008_friend_rankings.sql`
- `supabase/migrations/0011_ranking_delta_periods.sql`
- `apps/mobile/src/lib/supabase/supabaseTerriRepository.ts`
- `apps/mobile/src/lib/supabase/__tests__/supabaseTerriRepository.ranking.test.ts`
- `apps/mobile/src/features/activities/__tests__/mockTerriRepository.test.ts`
- `apps/mobile/src/lib/supabase/__tests__/supabaseSqlContracts.test.ts`
- `docs/adr/0004-friend-ranking-rpc.md`
- `docs/adr/0008-ranking-delta-snapshots.md`

内容:

- `list_friend_rankings()` を追加。
- 対象は本人と `friendships.status = 'accepted'` の友達だけ。
- 面積は `daily_activities.area_m2` の合計。
- `rank` は総面積降順の `dense_rank()`。同面積は同rank。
- 表示順は `rank asc, display_name asc`。
- `delta_area_m2` はDBの `current_date` を基準に、直近7日合計からその前7日合計を引く。
- `supabaseTerriRepository.getRankings()` はRPC前に `ensureProfile()` を実行し、新規profile作成競合を避ける。

### 5. 友達の確定済み陣地表示

主なファイル:

- `supabase/migrations/0009_friend_territories.sql`
- `apps/mobile/src/lib/repositories/terriRepository.ts`
- `apps/mobile/src/lib/repositories/mockTerriRepository.ts`
- `apps/mobile/src/lib/supabase/supabaseTerriRepository.ts`
- `apps/mobile/src/features/map/components/HomeMapScreen.tsx`
- `apps/mobile/src/components/map/MapSurface.tsx`
- `docs/adr/0005-friend-territories-rpc.md`

内容:

- `list_friend_territories()` RPCを追加。
- accepted friendの `territories(state='final')` だけをGeoJSONで返す。
- 自分のterritoryと友達のlive previewは混ぜない。
- S04では友達final territoryを低opacityの別レイヤーで描画する。

### 6. 友達ライブ現在地Presence

主なファイル:

- `supabase/migrations/0010_friend_live_presence_realtime.sql`
- `apps/mobile/src/lib/realtime/terriPresenceClient.ts`
- `apps/mobile/src/lib/realtime/PresenceProvider.tsx`
- `apps/mobile/src/lib/supabase/supabaseTerriPresenceClient.ts`
- `apps/mobile/src/features/friends/services/livePresence.ts`
- `apps/mobile/src/features/friends/hooks/useFriendLivePresence.ts`
- `apps/mobile/src/features/tracking/hooks/useLiveTerritory.ts`
- `docs/adr/0007-friend-live-presence.md`

内容:

- `presence:user:{userId}` のprivate Presence channelを採用。
- 本人だけが自分のchannelへtrackし、本人またはaccepted friendだけがsubscribeできるRLS policyを `realtime.messages` に追加。
- `location_sharing_enabled=false` ではPresenceを送らず、既存Presenceをuntrackする。
- tracking hookが現在地更新時に15秒間隔でPresenceを送る。
- friends hookが友達Presenceを購読し、承認済み友達一覧へ位置/active/更新時刻だけmergeする。
- 友達ライブ現在地はPostgresに保存しない。

## 検証済みコマンド

```bash
pnpm --filter @terri/mobile typecheck
pnpm --filter @terri/mobile test
pnpm --filter @terri/mobile exec expo config --type public
pnpm --filter @terri/mobile exec expo config --type introspect
git diff --check
supabase db push --local
supabase migration list --local
supabase db diff --local --schema public,realtime
```

確認済み結果:

- TypeScript typecheck通過
- Jest全体通過: 24 suites / 108 tests
- Expo public configでMapLibre plugin解決を確認済み
- Expo introspectで `app.terri.mobile`、MapLibre plugin、iOS/Android位置情報権限を確認済み
- `/tmp` コピーで iOS/Android prebuild成功。iOSはアプリアイコン未設定警告のみ
- whitespace check通過
- local migration `0011` まで適用済み
- local DBで `list_friend_rankings()` の直近7日対前7日delta、accepted friend限定、同rankを実データで確認済み
- `supabase db diff --local --schema public,realtime` は `No schema changes found`

## 現在の作業ツリー注意

このhandoff更新commit後も、以下は未commitとして残す。

- `supabase/prod-schema-before.sql`
  - prod schema dump。用途、生成日時、どの反映前かを確認するまで実装commitへ混ぜないこと。

`AGENTS.md` はADR運用と `docs/architecture.md` 更新ルールを追記済み。参照先の `docs/ADR運用.md` と同じcommitに含める。

### 7. Native MapLibre MapSurface

主なファイル:

- `apps/mobile/src/components/map/MapSurface.native.tsx`
- `apps/mobile/src/components/map/mapNativeLayers.ts`
- `apps/mobile/src/components/map/__tests__/mapNativeLayers.test.ts`
- `apps/mobile/app.json`
- `docs/adr/0009-native-maplibre-map-surface.md`

内容:

- `@maplibre/maplibre-react-native` を追加。
- `expo-system-ui` を追加し、Androidの `userInterfaceStyle` prebuild警告を解消。
- Nativeの `MapSurface` をMapLibre `Map` / `Camera` / `GeoJSONSource` / `Layer` / `Marker` で実装。
- S04 screenは既存どおり `MapSurface` propsだけに依存し、MapLibreを直接importしない。
- 友達確定済み陣地、live preview、tracking route、友達marker、自分markerを別レイヤーで描画する。
- MapLibre native moduleを使うため、実機確認はExpo Goではなくdev build/prebuildが必要。
- dev buildはアプリ内定義のOSM raster tile style。本番style/tilesの選定は未完了。

## 次に実装するべきこと

優先度1: remote Supabaseへの最新migration反映確認

現状:

- `0009_friend_territories.sql`、`0010_friend_live_presence_realtime.sql`、`0011_ranking_delta_periods.sql` はremote未反映。
- local Supabaseでは `0011` まで適用・schema diff確認済み。

実装候補:

- remote適用はSupabase access tokenと明示指示を受けてから行う。
- 適用前にremote schema dumpとmigration listを確認する。

### 2. 実機でのGPS/地図/権限/Presence検証

現状:

- TypeScript/Jestでは通過。
- 実機のForeground GPS、Realtime Presence、Leaflet Web表示、Native MapLibre表示は未検証。

実装候補:

- dev build/prebuild後にiOS/Android実機で位置情報許可、共有OFF、領土化ON、Presence送受信、MapLibre表示を確認する。
- Webはdev serverでS04の地図操作と友達マーカーを確認する。

### 3. 本番/ローカル環境の切り替え運用

現状:

- 直近作業はlocal Supabaseに納める方針。
- remote適用にはSupabase access tokenと明示指示が必要。

実装候補:

- `.env.local` / `.env.production` の運用ドキュメント化。
- アプリ内dev表示で接続先を見分ける。
- prod接続中に検証用アカウント以外で危険操作しないための運用メモを追加。

## 推奨開始手順

次のCodexはまず以下を実行する。

```bash
git status --short
pnpm --filter @terri/mobile typecheck
pnpm --filter @terri/mobile test
```

次に、友達の確定済み陣地表示RPCのADR proposalを作る。

```text
docs/adr-proposals/0005-friend-territories-rpc.md
```
