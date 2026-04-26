# 常時テリトリー生成をSupabase基盤の前提にする

## ステータス

承認

## コンテキスト

TERRIは、ユーザーが `START` を押した時だけ移動を記録する運動アプリではなく、位置情報権限とテリトリー生成設定が有効な限り、日常移動が自然に陣地へ変わる位置情報ゲームである。

実装前方針は `docs/adr-proposals/0001-continuous-territory-capture.md` に記録した。今回、その方針に基づき、モバイルのrepository契約、LIVE状態管理、mock実装、Supabase migration、Edge Function scaffold、`docs/architecture.md` を常時テリトリー生成型へ更新した。

判断対象:

```text
Mobile
  ↓ ensureDailyActivity / appendLocationPoint / syncLiveTerritory
Supabase DB
  ↓ daily_activities / location_points / territories
Edge Functions
  ↓ sync-live-territory / finalize-daily-activity
PostGIS
  ↓ live/final territory calculation
Realtime Presence
  ↓ 友達現在地だけを短期配信
```

## 検討した選択肢

### 選択肢A: START/STOPセッション型を維持する

利点:

- 実装単位が分かりやすい。
- STOP時に確定処理を呼ぶだけでよい。

欠点:

- STARTを押し忘れた移動が陣地化されない。
- TERRIの「常に生きている地図」体験とずれる。
- STOP忘れやアプリ中断時にデータ状態が不整合になりやすい。

採用可否:

不採用。

理由:

常時開始状態をプロダクトの前提にするため、START/STOPを正規データ生成の境界にしない。

### 選択肢B: 日次のopen activityへ常時GPS点を蓄積する

利点:

- 日常移動を自然に陣地化できる。
- 履歴の「今日」「昨日」と相性がよい。
- RLS、再計算、日次finalizeの単位が明確になる。
- mockとSupabase repositoryを同じ契約へ揃えやすい。

欠点:

- 日付境界、timezone、長時間停止、交通機関移動の扱いを今後詰める必要がある。

採用可否:

採用。

理由:

常時LIVE体験、履歴、ランキング、PostGIS集計、RLS境界を最も単純に両立できる。

## 決定

Supabase基盤とモバイル契約は、`START/STOP` ではなく、日次の常時テリトリー生成を前提にする。

採用したrepository契約:

```text
ensureDailyActivity
  ↓ 同一user/local_dateのopen daily activityを冪等に確保

appendLocationPoint
  ↓ daily_activity_idへGPS点を追加

syncLiveTerritory
  ↓ live territoryを再計算/upsert

finalizeDailyActivity
  ↓ 日次activityをfinalizedにしてfinal territoryを固定
```

採用したSupabase構造:

```text
profiles
  - territory_capture_enabled
  - location_sharing_enabled
  - background_tracking_enabled

daily_activities
  - user_id
  - local_date
  - timezone
  - status: open | finalized | paused

location_points
  - daily_activity_id
  - position
  - accuracy_m
  - speed_mps
  - recorded_at

territories
  - daily_activity_id
  - polygon
  - simplified_polygon
  - area_m2
  - state: live | final
```

採用したEdge Function境界:

```text
sync-live-territory
  ↓ public.sync_live_territory RPCを呼ぶ

finalize-daily-activity
  ↓ public.finalize_daily_activity RPCを呼ぶ
```

`docs/architecture.md` は、この決定に合わせて更新した。今後の実装・レビューでは、START/STOP型ではなく、このADRと更新済み `docs/architecture.md` を優先する。

## 影響

- Mobile:
  - `useTrackingSession` を削除し、`useLiveTerritory` を追加した。
  - `TrackingControls` を削除し、`LiveTerritoryPanel` を追加した。
  - `StartDock` の中央ボタンは `START` ではなくLIVE状態表示になった。
  - `HomeMapScreen` は常時LIVE状態と同期状態を表示する。

- Repository:
  - `startActivity` / `completeActivity` を削除した。
  - `ensureDailyActivity` / `appendLocationPoint` / `syncLiveTerritory` / `finalizeDailyActivity` を追加した。
  - mock repositoryは、capture OFF、not-found、日次ensure冪等性を表現する。

- Shared contract:
  - `DailyActivity`, `LocationPointInput`, `LiveTerritoryResult`, `FinalizedDailyActivity`, `LiveTerritoryStats` を追加した。
  - `UserProfile` に `territoryCaptureEnabled` を追加した。

- Supabase:
  - `supabase/migrations` にPostGIS拡張、core schema、index、RLS、live territory RPCを追加した。
  - `supabase/functions/sync-live-territory` と `supabase/functions/finalize-daily-activity` を追加した。

- Test:
  - live territory state reducer testを追加した。
  - mock repository contract testを日次Activity契約へ更新した。
  - 既存のmap/friends/activity metric testは継続した。

## 備考

- 作成日: 2026-04-26
- 更新日: 2026-04-26
- 関連ADR:
  - docs/adr-proposals/0001-continuous-territory-capture.md
- 置き換え関係:
  - なし
- 関連ファイル:
  - docs/architecture.md
  - docs/adr-proposals/0001-continuous-territory-capture.md
  - packages/shared/src/index.ts
  - apps/mobile/src/lib/repositories/terriRepository.ts
  - apps/mobile/src/lib/repositories/mockTerriRepository.ts
  - apps/mobile/src/features/tracking/hooks/useLiveTerritory.ts
  - apps/mobile/src/features/tracking/services/liveTerritoryState.ts
  - apps/mobile/src/features/map/components/HomeMapScreen.tsx
  - apps/mobile/src/features/map/components/LiveTerritoryPanel.tsx
  - apps/mobile/src/features/map/components/StartDock.tsx
  - supabase/migrations/0001_extensions.sql
  - supabase/migrations/0002_schema_core.sql
  - supabase/migrations/0003_indexes.sql
  - supabase/migrations/0004_rls_core.sql
  - supabase/migrations/0005_live_territory_functions.sql
  - supabase/functions/sync-live-territory/index.ts
  - supabase/functions/finalize-daily-activity/index.ts
- 参照資料:
  - docs/ADR運用.md
  - docs/architecture.md
  - docs/移動距離連動型陣取り位置情報アプリ「TERRI」 最終要件定義書.md
- 実装時の差分:
  - 実装前方針では `packages/geo` への共通ジオメトリ抽出を想定したが、今回の基盤ではPostGIS RPCへ先に寄せた。
  - foreground/backgroundの実GPS取得は今回未実装。repository契約とDB境界のみ先に常時LIVE型へ変更した。
- 未決事項:
  - timezone変更時の日次境界の扱い
  - 交通機関移動や長時間停止をsegment化するか
  - background trackingをPhase 1に含めるか
  - `sync-live-territory` の起動条件を時間、距離、アプリ復帰のどれで最適化するか
