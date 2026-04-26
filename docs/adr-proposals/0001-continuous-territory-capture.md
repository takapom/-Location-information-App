# 常時テリトリー生成をSupabase基盤の前提にする

## ステータス

提案済み

## コンテキスト

TERRIは「歩いた分だけ、世界が自分のものになる」位置情報陣取りアプリである。

当初の `docs/architecture.md` では、ユーザーが `START` を押して `activities.status = active` の移動セッションを作り、`STOP` 後に `complete-activity` Edge Functionで確定済み陣地を生成する前提だった。

しかし、最新方針では、ユーザーが `START` を押したタイミングで位置情報やテリトリー生成が始まるのではなく、位置情報権限とテリトリー生成設定が有効な限り、TERRIは常時テリトリー生成状態であるべきとする。

この変更は、Supabase基盤の責務、DBテーブル設計、repository interface、Edge Functions、Realtime Presence、RLS、テスト方針に影響する。

既存設計から更新が必要な対象:

- `docs/architecture.md` 2. 採用アーキテクチャ
- `docs/architecture.md` 3. ディレクトリ構造
- `docs/architecture.md` 4. ドメインモデル
- `docs/architecture.md` 5. API/データアクセス設計
- `docs/architecture.md` 6. トラッキングとポリゴン生成
- `docs/architecture.md` 8. Mobile UI構造
- `docs/architecture.md` 10. 開発フェーズ
- `docs/architecture.md` 11. 初期実装順序

置き換え理由:

- `START/STOP` セッション型は、運動記録アプリのメンタルモデルに近く、TERRIの「常に生きている地図」「移動が自然に陣地になる」体験とずれる。
- STOPを確定トリガーにすると、押し忘れ、バックグラウンド中断、日常移動の取りこぼしが起きやすい。
- 常時開始型では、プライバシー設定、権限状態、バックグラウンド更新、日次集計を明確に分離する必要がある。
- Supabase基盤は、手動セッション完了ではなく、継続的なGPS点保存と定期的なテリトリー同期を前提にする必要がある。

判断対象:

```text
Mobile
  ↓ 位置情報権限と設定に応じて常時GPS点を送信
Supabase DB
  ↓ 日次の移動単位へGPS点を保存
Edge Functions
  ↓ openな日次移動からテリトリーを同期・日次確定
PostGIS
  ↓ 確定済み/同期済みポリゴンと面積を保持
Realtime Presence
  ↓ 友達現在地だけを短期配信
```

このADRは実装前方針であり、実装後に同じ連番で `docs/adr/0001-continuous-territory-capture.md` を作成または更新する。

## 検討した選択肢

### 選択肢A: START/STOPセッション型を維持する

利点:

- 実装単位が分かりやすい。
- `complete-activity` をSTOP後の確定処理として設計しやすい。
- 活動履歴が「1回の移動」として自然に区切られる。

欠点:

- STARTを押し忘れた移動が陣地化されない。
- TERRIの「常に地図が生きている」体験とずれる。
- STOP忘れやアプリ中断時に、activityの終了状態が不整合になりやすい。
- 常時位置情報共有アプリに近いUXなのに、運動記録アプリの操作モデルになる。

採用可否:

不採用。

理由:

TERRIの体験価値は、ユーザーが明示的に記録を始めた時間だけでなく、日常移動が自然に陣地へ変わることにある。START/STOPを正規データ生成の境界にすると、UXとデータモデルの中心がずれる。

### 選択肢B: アプリ起動中だけ常時テリトリー生成する

利点:

- バックグラウンド権限やバッテリー制御の複雑さを初期実装から減らせる。
- ユーザーがアプリを見ている間は、常時LIVEな地図体験を作れる。
- Phase 1の実装範囲を抑えられる。

欠点:

- アプリを閉じている間の移動が陣地化されない。
- 「常時開始されている状態」としては不完全。
- 将来バックグラウンド更新を足すときに、データモデルがセッション寄りだと再設計が必要になる。

採用可否:

一部採用。

理由:

実装フェーズとしてはforeground常時更新から開始してよい。ただし、Supabase基盤とrepository contractは、バックグラウンド更新を後から足しても壊れない常時テリトリー生成モデルにする。

### 選択肢C: 日次のopen activityへ常時GPS点を蓄積する

利点:

- START/STOPに依存せず、日常移動を自然に陣地化できる。
- 履歴画面の「今日」「昨日」と相性がよい。
- 日付単位で集計、ランキング、finalize、再計算を管理しやすい。
- mobile mockとSupabase repositoryの契約を `ensure -> append -> sync` に整理できる。
- `location_sharing_enabled` とテリトリー生成設定を分離しやすい。

欠点:

- ユーザーのローカル日付、タイムゾーン、日跨ぎ処理が必要になる。
- 1日のGPS点が多くなるため、インデックス、バッチ同期、簡略化が重要になる。
- 「1回の散歩」のような細かい活動履歴は、別途segment化が必要になる可能性がある。

採用可否:

採用。

理由:

常時開始型の体験と、履歴・ランキング・確定済み陣地の永続化を両立しやすい。Phase 1では日次単位を正規の移動単位とし、将来必要になったら停止時間や移動パターンからsegmentを派生させる。

### 選択肢D: GPS点だけを保存し、activity/daily unitを作らない

利点:

- 初期のDBテーブルが少なく見える。
- 任意の期間で後から集計できる。

欠点:

- RLS、集計、履歴、ランキング、テリトリー再計算の境界が曖昧になる。
- どのGPS点がどの確定済み陣地に対応するか追跡しづらい。
- 日次finalizeや冪等な再計算の単位を別に作る必要が出る。

採用可否:

不採用。

理由:

GPS点は大量に増えるため、正規の集計単位なしに保存すると運用・再計算・テストが難しくなる。

## 決定

TERRIのSupabase基盤は、`START/STOP` セッション型ではなく、常時テリトリー生成型を前提に設計する。

ユーザーのテリトリー生成は、次の条件を満たす限り常時有効とする。

- 位置情報権限が許可されている
- `territory_capture_enabled = true`
- アプリの動作状態に応じてforegroundまたはbackgroundでGPS点を取得できる

友達へのライブ現在地共有は別設定とし、テリトリー生成とは分離する。

```text
territory_capture_enabled
  ↓ 自分の移動を陣地化するか

location_sharing_enabled
  ↓ 友達へ現在地Presenceを送るか

background_tracking_enabled
  ↓ アプリ非表示時もGPS点を送るか
```

### モバイル状態モデル

既存の `idle / requestingPermission / tracking / stopping / completed / error` は、実装時に次の状態へ置き換える。

```text
checkingPermission
permissionDenied
live
syncing
pausedByPrivacy
backgroundLimited
error
```

`START` は正規データ生成の開始操作ではなくする。Phase 1では、下部dockの中央操作は `LIVE` 状態表示、または今日の獲得状況を開く操作に変更する。

### Repository contract

既存の `startActivity()` と `completeActivity(activityId)` は、Supabase実装前に常時テリトリー生成向けの契約へ置き換える。

予定するinterface:

```ts
type EnsureDailyActivityInput = {
  localDate: string;
  timezone: string;
};

type AppendLocationPointInput = {
  dailyActivityId: string;
  latitude: number;
  longitude: number;
  accuracyM: number;
  speedMps?: number;
  recordedAt: string;
};

interface TerriRepository {
  ensureDailyActivity(input: EnsureDailyActivityInput): Promise<DailyActivity>;
  appendLocationPoint(input: AppendLocationPointInput): Promise<void>;
  syncLiveTerritory(dailyActivityId: string): Promise<LiveTerritoryResult>;
  finalizeDailyActivity(dailyActivityId: string): Promise<FinalizedDailyActivity>;
}
```

Phase 1では `finalizeDailyActivity` は日付変更時または手動デバッグ用途でよい。通常の画面表示は `syncLiveTerritory` の結果を使う。

### Supabase DB設計

`activities` を手動セッションとして扱わず、日次移動単位へ置き換える。

実装時の候補テーブル名は `daily_activities` とする。

```text
public.daily_activities
  - id uuid primary key
  - user_id uuid not null
  - local_date date not null
  - timezone text not null
  - status text not null check (status in ('open', 'finalized', 'paused'))
  - started_at timestamptz
  - ended_at timestamptz
  - distance_m double precision not null default 0
  - area_m2 double precision not null default 0
  - point_count integer not null default 0
  - created_at timestamptz not null default now()
  - updated_at timestamptz not null default now()
  - unique (user_id, local_date)

public.location_points
  - id uuid primary key
  - daily_activity_id uuid not null references public.daily_activities(id)
  - user_id uuid not null
  - position geography(point, 4326) not null
  - accuracy_m double precision
  - speed_mps double precision
  - recorded_at timestamptz not null
  - accepted_for_geometry boolean not null default true

public.territories
  - id uuid primary key
  - daily_activity_id uuid not null references public.daily_activities(id)
  - user_id uuid not null
  - polygon geometry(multipolygon, 4326) not null
  - simplified_polygon geometry(multipolygon, 4326)
  - area_m2 double precision not null
  - algorithm_version text not null
  - state text not null check (state in ('live', 'final'))
  - calculated_at timestamptz not null default now()
```

`profiles` には少なくとも次を持たせる。

```text
profiles
  - location_sharing_enabled boolean not null default true
  - territory_capture_enabled boolean not null default true
  - background_tracking_enabled boolean not null default false
```

### Edge Functions

`complete-activity` は常時開始型と名前・責務が合わないため、実装前方針として次の2つに分ける。

```text
sync-live-territory
  ↓ openなdaily_activityのGPS点からlive territoryを再計算する

finalize-daily-activity
  ↓ 日付変更後、daily_activityをfinalizedにしてfinal territoryを固定する
```

`sync-live-territory` の責務:

```text
JWT検証
  ↓
daily_activity owner検証
  ↓
openまたはpaused状態の確認
  ↓
location_pointsをrecorded_at順で取得
  ↓
accuracy_m >= 50をgeometry計算から除外
  ↓
異常速度・ジャンプ・重複点を除外
  ↓
LineString生成
  ↓
30m buffer
  ↓
20点以上かつ500m以内で閉じたrouteなら内側面積を追加
  ↓
simplified polygon生成
  ↓
territories(state='live')をupsert
  ↓
daily_activitiesのdistance_m / area_m2 / point_countを更新
```

`finalize-daily-activity` の責務:

```text
JWTまたはスケジュール実行の検証
  ↓
対象daily_activityの所有者・日付・状態を確認
  ↓
最新のsync-live-territory相当の計算を実行
  ↓
territories(state='final')を保存
  ↓
daily_activities.status = finalized
  ↓
以後の通常GPS append対象から外す
```

### Supabase Realtime

Realtime Presenceは、友達現在地とアクティブ感のためだけに使う。

常時テリトリー生成になっても、友達現在地履歴はPostgresへ保存しない。

```text
Mobile
  ↓ location_sharing_enabled = true の場合だけPresence送信
Realtime Presence
  ↓ 友達だけが購読できるchannelで短期配信
Mobile Map
  ↓ 30分以上更新がなければoffline扱い

Postgres
  ↓ 友達現在地履歴は保存しない
```

### docs/architecture.md 更新方針

このADRが承認された場合、`docs/architecture.md` は次のように更新する。

- `トラッキングUI` を `常時テリトリー生成状態表示` へ変更する
- `Activity` を `DailyActivity` または日次移動単位として再定義する
- `complete-activity` を `sync-live-territory` と `finalize-daily-activity` に置き換える
- `START/STOP` を正規データ生成の境界として扱わない
- Phase 1の完了条件を「START/STOPできる」ではなく「権限許可後、日次移動がGPS点保存とlive territory同期に反映される」に変更する

## 影響

- Mobile:
  - `apps/mobile/src/features/tracking` は、実装時に `live territory` の状態管理へ意味変更する。
  - `useTrackingSession` は `useLiveTerritory` 相当へ置き換える。
  - `StartDock` の中央STARTボタンは、LIVE状態表示または今日の獲得状況への導線へ変更する。
  - S04メインマップは、常に現在地、確定済み陣地、live preview、同期状態を表示する。
  - `location_sharing_enabled` と `territory_capture_enabled` をUI上で混同しない。

- Repository:
  - `startActivity` / `completeActivity` を `ensureDailyActivity` / `appendLocationPoint` / `syncLiveTerritory` / `finalizeDailyActivity` へ置き換える。
  - mock repositoryは、Supabase実装と同じ非同期契約、エラー、境界ケースを持つ。
  - 画面は引き続きSupabaseを直接呼ばず、repository interfaceを通す。

- Database:
  - `activities` は手動セッションではなく、`daily_activities` 相当の日次移動単位として扱う。
  - `location_points` は `daily_activity_id` に紐づく。
  - `territories` は `live` と `final` の状態を区別する。
  - `(user_id, local_date)`, `(daily_activity_id, recorded_at)`, geography/geometry GiST indexを優先する。

- RLS:
  - `daily_activities` は本人だけが作成・更新・参照できる。
  - `location_points` は本人の `daily_activity_id` にだけinsertできる。
  - `territories` は本人のものだけを基本参照可能にし、友達公開はPhase 2でfriendship認可を追加する。
  - `user_id` はrequest bodyではなくauth contextから導く。

- Edge Functions:
  - `complete-activity` は初期実装対象にしない。
  - `sync-live-territory` は冪等なlive territory upsertを行う。
  - `finalize-daily-activity` は日次確定を担当する。
  - 不正payload、未認証、他人のdaily_activity、finalized済みへの通常appendを拒否する。

- Realtime:
  - 常時テリトリー生成と友達現在地共有を分離する。
  - `location_sharing_enabled = false` のときはPresenceを送らない。
  - 友達現在地はPostgresに保存しない。

- Privacy:
  - テリトリー生成、自分の履歴保存、友達への現在地共有、バックグラウンド更新を別設定として扱う。
  - 共有OFFは友達へのPresence送信だけを止める。テリトリー生成を止めるかは `territory_capture_enabled` が決める。
  - ユーザーがテリトリー生成自体を止めた場合、GPS点を永続化しない。

- Test:
  - repository contract test:
    - `ensureDailyActivity` が同一ユーザー・同一local_dateで冪等である。
    - `appendLocationPoint` が権限拒否・capture OFF・不正activityで失敗する。
    - `syncLiveTerritory` が同じGPS点集合に対して冪等である。
  - RLS test:
    - 自分のdaily_activityは読める/書ける。
    - 他人のdaily_activityにはGPS点をinsertできない。
    - 非友達はfriend-only territoryを読めない。
  - Edge Function test:
    - 未認証requestを拒否する。
    - ownerだけがsync/finalizeできる。
    - finalized済みdaily_activityへの通常sync/appendを制御する。
    - accuracy >= 50m の点はgeometry計算対象から外す。
  - Frontend test:
    - 権限許可後にLIVE状態になる。
    - 権限拒否時にGPS点を送らない。
    - `territory_capture_enabled=false` では永続化しない。
    - `location_sharing_enabled=false` ではPresenceを送らない。
    - 低速30秒で送信間隔が30秒になる。

## 備考

- 作成日: 2026-04-26
- 更新日: 2026-04-26
- 関連ADR:
  - なし
- 置き換え関係:
  - なし
- 関連ファイル:
  - docs/ADR運用.md
  - docs/architecture.md
  - docs/移動距離連動型陣取り位置情報アプリ「TERRI」 最終要件定義書.md
  - apps/mobile/src/features/tracking/hooks/useTrackingSession.ts
  - apps/mobile/src/features/tracking/services/trackingState.ts
  - apps/mobile/src/lib/repositories/terriRepository.ts
  - apps/mobile/src/lib/repositories/mockTerriRepository.ts
  - apps/mobile/src/lib/supabase/supabaseTerriRepository.ts
  - packages/shared/src/index.ts
  - supabase/migrations
  - supabase/functions/sync-live-territory/index.ts
  - supabase/functions/finalize-daily-activity/index.ts
- 参照資料:
  - docs/ADR運用.md
  - docs/architecture.md
  - docs/移動距離連動型陣取り位置情報アプリ「TERRI」 最終要件定義書.md
- 実装時の差分:
  - 実装前方針のため、現時点ではなし
- 未決事項:
  - 日次境界に使うtimezoneの保存形式と変更時の扱い
  - `daily_activities` というテーブル名で確定するか、既存概念との互換のため `activities` を日次化するか
  - foreground常時更新から開始するか、Phase 1からbackground trackingを含めるか
  - `sync-live-territory` の起動条件を時間しきい値、距離しきい値、アプリ復帰、手動同期のどれにするか
  - 長時間停止や交通機関移動をsegmentとして扱うか
