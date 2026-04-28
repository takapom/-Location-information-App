# TERRI Next Codex Handoff

## 現在の状態

最終作業commit:

```text
68cf886 feat: add friend ranking rpc
```

Supabase反映:

- local Supabase:
  - DB migration `0001` から `0008` まで適用済み
  - `list_incoming_friend_requests`
  - `list_outgoing_friend_requests`
  - `list_accepted_friends`
  - `respond_friend_request`
  - `list_friend_rankings`
- remote Supabase:
  - 直近の友達申請/ランキング実装はremoteへ適用していない
  - 以降の作業も、明示がない限りlocalに納める

動作確認:

- Expo dev server起動確認済み
  - Web: `http://localhost:8081`
  - Metro: `exp://127.0.0.1:8081`
- S04でランキングUIの実データ表示確認済み
- local Supabase上で同面積ユーザーが同じrankになることを確認済み

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
- `apps/mobile/src/lib/supabase/supabaseTerriRepository.ts`
- `apps/mobile/src/lib/supabase/__tests__/supabaseTerriRepository.ranking.test.ts`
- `apps/mobile/src/features/activities/__tests__/mockTerriRepository.test.ts`
- `apps/mobile/src/lib/supabase/__tests__/supabaseSqlContracts.test.ts`
- `docs/adr/0004-friend-ranking-rpc.md`

内容:

- `list_friend_rankings()` を追加。
- 対象は本人と `friendships.status = 'accepted'` の友達だけ。
- 面積は `daily_activities.area_m2` の合計。
- `rank` は総面積降順の `dense_rank()`。同面積は同rank。
- 表示順は `rank asc, display_name asc`。
- `delta_area_m2` は比較スナップショット未実装のためMVPでは `0`。
- `supabaseTerriRepository.getRankings()` はRPC前に `ensureProfile()` を実行し、新規profile作成競合を避ける。

## 検証済みコマンド

```bash
pnpm --filter @terri/mobile typecheck
pnpm --filter @terri/mobile test
git diff --check
supabase db push --local
supabase migration list --local
```

確認済み結果:

- TypeScript typecheck通過
- Jest全体通過: 19 suites / 81 tests
- whitespace check通過
- local migration `0008` 適用済み
- local DBに `list_friend_rankings` が存在することを確認済み

## 現在の作業ツリー注意

このhandoff更新commit後も、以下は未commitとして残す。

- `supabase/prod-schema-before.sql`
  - prod schema dump。用途、生成日時、どの反映前かを確認するまで実装commitへ混ぜないこと。

`AGENTS.md` はADR運用と `docs/architecture.md` 更新ルールを追記済み。参照先の `docs/ADR運用.md` と同じcommitに含める。

## 次に実装するべきこと

優先度1: 友達の確定済み陣地表示RPC

理由:

- 友達申請、承認済み友達一覧、友達ランキングは実装済み。
- 現状、移動して自分のactivity/areaは更新されるが、友達から見える地図上の陣地表示にはまだつながっていない。
- S04メインマップの体験として、accepted友達の `territories(state='final')` を表示するのが次の自然な単位。

実装方針:

1. ADR proposal追加
   - `docs/adr-proposals/0005-friend-territories-rpc.md`
   - 実装後に `docs/adr/0005-friend-territories-rpc.md` を作成する。

2. Shared contract追加
   - `FriendTerritory`
   - 最小のGeoJSON polygon/multipolygon型

3. Supabase migration追加
   - `supabase/migrations/0009_friend_territories.sql`
   - RPC名は `list_friend_territories()`
   - `auth.uid()` 必須
   - `friendships.status = 'accepted'` の友達だけ対象
   - `territories.state = 'final'` だけ対象
   - geometryは `ST_AsGeoJSON(coalesce(simplified_polygon, polygon))::jsonb` で返す
   - 自分のterritoryは混ぜない

4. Repository contract追加
   - `TerriRepository.getFriendTerritories(): Promise<FriendTerritory[]>`
   - mock/Supabase両方に実装
   - 画面からSupabaseを直接呼ばない

5. UI追加
   - `HomeMapScreen` の初期ロードに `getFriendTerritories()` を追加
   - `MapSurface` に `friendTerritories` propsを追加
   - 友達final territoryは自分のlive previewと別レイヤー、低opacityで描画
   - friend marker/presenceとは別データとして扱う

6. Tests
   - SQL contract: `auth.uid()`, `accepted`, `state = 'final'`, `ST_AsGeoJSON`, grant
   - Supabase mapper: m2 to km2、color fallback、GeoJSON保持
   - mock repository: `getFriendTerritories()` 契約
   - MapSurface: friend territory polygonが描画入力に含まれること

## 優先度2以降

### 2. 友達現在地Presence

現状:

- 友達プロフィール一覧は取得できる。
- 位置情報共有ON/OFFはプロフィールとして取得できる。
- ライブ現在地はまだRealtime Presenceへ接続していない。

実装候補:

- 友達グループまたはuser pair単位のchannel設計をADR化する。
- `location_sharing_enabled = false` ではpresenceを送らない。
- 友達のライブ現在地履歴は保存しない。
- 30分更新がなければoffline扱いにする。

### 3. ranking deltaの実装

現状:

- `list_friend_rankings()` の `delta_area_m2` は常に0。

実装候補:

- 日次または週次のランキングスナップショットを設計する。
- 比較対象期間をADRで決めてからDB schema/RPCを追加する。

### 4. 本番/ローカル環境の切り替え運用

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
