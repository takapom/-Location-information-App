# TERRI Architecture

> 対象要件: `移動距離連動型陣取り位置情報アプリ「TERRI」 最終要件定義書.md` v1.1  
> 方針: 位置情報アプリとしての第一原理に基づき、主バックエンドをSupabaseへ変更する。Cloudflareは初期採用せず、将来の超低遅延リアルタイム要件が出た場合の拡張候補に留める。

---

## 1. 第一原理からの設計判断

TERRIは「移動した軌跡を現実世界の陣地として可視化し、友達と競う」アプリである。したがって、最初に最適化すべき対象は単純なAPI処理ではなく、位置情報データの保存、計算、検索、権限制御である。

| 原理 | 要求される性質 | アーキテクチャ上の結論 |
|---|---|---|
| 位置情報は構造化データ | GPS点、LineString、Polygon、面積、近傍検索を自然に扱う必要がある | Supabase Postgres + PostGISを主データストアにする |
| 確定済み陣地は履歴資産 | 活動履歴、確定ポリゴン、面積、ランキングは永続化・集計が必要 | Postgresに正規化し、PostGIS geometry/geographyで保存する |
| 友達現在地は鮮度が価値 | 友達の現在地は履歴ではなく、今どこにいるかが価値 | Supabase Realtime Presence/Broadcastで短期状態として配信する |
| GPSはノイズを含む | accuracy除外、異常速度検知、重複点除外、簡略化が必要 | DB制約、Edge Function、`packages/geo`で多層に検証する |
| UXは即時反応が重要 | 位置情報許可後は、開始操作なしで移動が領土化される感覚が必要 | クライアントで軽量プレビュー、サーバーでlive/finalテリトリーを同期する。ユーザー向けには「LIVE」ではなく「位置情報ON/OFF」「領土化ON/一時停止」と表現する |
| プライバシーが競争力 | 友達現在地の履歴保存を避け、共有OFFを即時反映する必要がある | Presenceは永続化しない。活動履歴は本人のデータとして保存する |
| MVP速度が重要 | 認証、DB、Realtime、Storageを早く統合する必要がある | Supabase Auth/RLS/Realtime/Storage/Edge Functionsを一体利用する |

---

## 2. 採用アーキテクチャ

```text
Expo Mobile App
  - GPS取得
  - Mapbox地図描画
  - 常時テリトリー生成状態表示
  - 暫定ポリゴンプレビュー
  - Supabase Auth session
  - Supabase Realtime subscription
        |
        | supabase-js / HTTPS / WebSocket
        v
Supabase
  - Auth
  - Postgres + PostGIS
  - Row Level Security
  - Realtime Presence/Broadcast
  - Storage
  - Edge Functions
        |
        +--> Postgres/PostGIS
        |      - users/profiles
        |      - daily_activities
        |      - location_points
        |      - territories
        |      - friendships
        |      - ranking queries/views
        |
        +--> Realtime
        |      - friends presence
        |      - live territory active state
        |
        +--> Postgres RPC
        |      - live territory synchronization
        |      - daily activity finalization
        |      - GPS validation
        |
        +--> Edge Functions
               - external API integration
               - invite/link flows that need server-only secrets
               - multi-service orchestration
```

### 2.1 技術スタック

| 領域 | 採用 | 理由 |
|---|---|---|
| Mobile | Expo + React Native + TypeScript | GPS、通知、SNSログイン、iOS/Android配布を現実的に扱える |
| Map | Mapbox SDK | 地図レイヤー、ポリゴン、アバターマーカー表現に強い |
| Backend Platform | Supabase | Auth、Postgres、Realtime、Storage、Edge Functionsを一体で扱える |
| Database | Supabase Postgres + PostGIS | 位置情報、ポリゴン、面積、近傍検索、空間インデックスに強い |
| Auth | Supabase Auth | Expo/React Nativeから扱いやすく、RLSと連動できる |
| Authorization | Postgres Row Level Security | 本人データ・友達データの境界をDB側でも強制できる |
| Realtime/Presence | Supabase Realtime Presence/Broadcast | 友達現在地・アクティブ状態の短期配信に使える |
| Storage | Supabase Storage | アバター、シェア用画像、将来のメディア保存に使える |
| Server Logic | Postgres RPC + Supabase Edge Functions | PostGISで完結する本人スコープ処理はRPC、外部API連携やserver-only secretが必要な処理はEdge Functionsに分ける |
| Validation | Zod | mobile/functions/sharedで同じスキーマを使える |
| Geometry | PostGIS + Turf.js系ラッパー | 永続データはPostGIS、クライアントプレビューは軽量JSで処理する |
| Monorepo | pnpm workspaces想定 | mobile/shared/geo/functionsの型とロジックを共有する |

### 2.2 Cloudflareを初期採用しない理由

Cloudflare Workers/Durable Objectsは低遅延リアルタイム協調に強い。一方で、TERRIの中核は「地理空間データの保存・計算・検索」であり、D1/SQLite中心にするとPostGIS相当の能力をアプリケーション側で補う必要がある。MVPではこの実装負荷が高く、チート検知・面積計算・ランキング集計の正確性も担保しづらい。

将来、友達現在地が15秒更新ではなく1秒未満のWebSocket同期を必要とする場合、Cloudflare Durable Objectsをpresence専用の補助基盤として再検討する。

---

## 3. ディレクトリ構造

```text
-Location-information-App/
  apps/
    mobile/
      app/                         # Expo Router画面定義
        _layout.tsx
        index.tsx                  # S01: splash/auth gate
        onboarding.tsx             # S02
        login.tsx                  # S03
        map.tsx                    # S04 常設ベース
        activity/[id].tsx          # S08
        profile.tsx                # S11
      src/
        features/
          auth/
          onboarding/
          map/
          tracking/                # 初期はlive territory状態管理を含む
          activities/
          friends/
          ranking/
          profile/
          share/
        components/
          ui/
          map/
          bottom-sheet/
        hooks/
        lib/
          supabase/
          permissions/
          storage/
          realtime/
        theme/
        assets/
      app.json
      package.json

  supabase/
    config.toml
    migrations/
      0001_extensions.sql
      0002_schema.sql
      0003_rls.sql
      0004_functions.sql
      0005_realtime.sql
    functions/
      issue-friend-invite/
        index.ts
      accept-friend-invite/
        index.ts
    seed.sql

  packages/
    shared/
      src/
        schemas/                   # Zod schemas shared by mobile/functions
        types/
        constants/
        api-contracts/
      package.json

    geo/
      src/
        gps-filter.ts              # accuracy/速度/重複点フィルタ
        distance.ts
        preview-buffer.ts          # クライアント用軽量プレビュー
        polygon-simplify.ts
        territory-builder.ts       # Edge Function用Facade
      package.json

    config/
      eslint/
      tsconfig/

  docs/
    architecture.md
    移動距離連動型陣取り位置情報アプリ「TERRI」 最終要件定義書.md
    images (2)/

  package.json
  pnpm-workspace.yaml
  turbo.json                       # 必要になった段階で導入
```

### 3.1 境界ルール

| 境界 | ルール |
|---|---|
| `apps/mobile` | UI、端末権限、GPS取得、ローカル状態、プレビュー描画、Supabase clientを担当 |
| `supabase/migrations` | DB拡張、テーブル、RLS、Postgres関数、Realtime設定を管理 |
| `supabase/functions` | 認可が必要なサーバー処理、確定計算、招待処理、検証処理を担当 |
| `packages/shared` | Zod schema、DTO、列挙値、共通定数だけを置く |
| `packages/geo` | GPS点の検証、プレビュー、ポリゴン生成補助。React Native/Supabase固有処理は入れない |
| Supabase Realtime | 友達現在地、オンライン状態、領土化中表示など揮発状態のみ |
| Supabase Postgres | 後から参照・集計するデータのみ。友達の現在地履歴は保存しない |

---

## 4. ドメインモデル

### 4.1 主要エンティティ

| Entity | 概要 |
|---|---|
| Profile | `auth.users`に紐づくアプリ用プロフィール。表示名、アバター、陣地色、位置共有設定を持つ |
| DailyActivity | 1日単位の常時テリトリー生成状態。日付、距離、面積、open/finalized状態を持つ |
| LocationPoint | DailyActivityに紐づくGPS点。自分の活動履歴として保存する |
| Territory | 確定済みポリゴン。PostGIS geometry、GeoJSON表示、面積を持つ |
| Friendship | 友達関係。pending/accepted/blockedなどの状態を持つ |
| Presence | 最新現在地とアクティブ状態。Supabase Realtime上の揮発データ |
| Ranking | 期間別の友達間ランキング。初期はビュー/クエリで都度集計する |

### 4.2 Postgres/PostGISテーブル案

```sql
create extension if not exists postgis;
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  friend_code text not null,
  display_name text not null,
  avatar_url text,
  territory_color text not null default '#F07060',
  emoji_status text,
  location_sharing_enabled boolean not null default true,
  territory_capture_enabled boolean not null default true,
  background_tracking_enabled boolean not null default false,
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.daily_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  local_date date not null,
  timezone text not null,
  status text not null check (status in ('open', 'finalized', 'paused')),
  started_at timestamptz,
  ended_at timestamptz,
  distance_m double precision not null default 0,
  area_m2 double precision not null default 0,
  point_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_date)
);

create table public.location_points (
  id uuid primary key default gen_random_uuid(),
  daily_activity_id uuid not null references public.daily_activities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  position geography(point, 4326) not null,
  accuracy_m double precision,
  speed_mps double precision,
  recorded_at timestamptz not null,
  accepted_for_geometry boolean not null default true
);

create index location_points_daily_recorded_at_idx
  on public.location_points (daily_activity_id, recorded_at);

create index location_points_position_gix
  on public.location_points using gist (position);

create table public.territories (
  id uuid primary key default gen_random_uuid(),
  daily_activity_id uuid not null references public.daily_activities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  polygon geometry(multipolygon, 4326) not null,
  simplified_polygon geometry(multipolygon, 4326),
  area_m2 double precision not null,
  algorithm_version text not null,
  state text not null check (state in ('live', 'final')),
  calculated_at timestamptz not null default now(),
  unique (daily_activity_id, state)
);

create index territories_user_id_idx
  on public.territories (user_id);

create index territories_polygon_gix
  on public.territories using gist (polygon);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references public.profiles(id) on delete cascade,
  receiver_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_user_id, receiver_user_id)
);
```

補足: `territories.polygon`は正規データとしてPostGIS geometryで持つ。クライアント表示にはAPI/SQLでGeoJSONへ変換して返す。

---

## 5. API/データアクセス設計

Supabaseでは、単純なCRUDは`supabase-js`からRLS付きで直接アクセスする。PostGISで完結する本人スコープの整合処理はRPCへ寄せ、外部API連携や複数サービスをまたぐ処理はEdge Functionsへ寄せる。

### 5.1 Phase 1

| 操作 | 実装方式 | 用途 |
|---|---|---|
| サインイン/セッション | Supabase Auth | SNS認証、セッション保持 |
| 自分のプロフィール取得/更新 | `profiles` direct query + RLS | 表示名、絵文字、陣地色、共有設定 |
| 日次Activity確保 | `daily_activities` upsert/RPC + RLS | 同一user/local_dateのopen単位を冪等に作成 |
| GPS点送信 | `location_points` insert RPC or batched insert | foreground watcherで位置更新を受け、精度50m未満かつ5秒経過または10m移動した点だけ保存 |
| liveテリトリー同期 | RPC `sync_live_territory` + RLS/auth.uid() | GPS検証、距離計算、live polygon upsert |
| 日次確定 | RPC `finalize_daily_activity` + RLS/auth.uid() | 日付変更後にfinal polygonを固定 |
| 履歴一覧 | `daily_activities` select + RLS | S07 |
| 活動詳細 | `daily_activities`/`territories` select + RLS | S08 |
| 陣地一覧 | `territories` select with GeoJSON view/RPC | S04地図表示 |

### 5.1.1 ローカル開発の接続方式

`apps/mobile` は `TerriRepository` を境界にして mock と Supabase を切り替える。ローカルSupabaseで動かす場合は `apps/mobile/.env` に次を設定する。

```text
EXPO_PUBLIC_TERRI_DATA_SOURCE=supabase
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<supabase statusで表示されるanon key>
```

`EXPO_PUBLIC_TERRI_DATA_SOURCE=mock`、またはanon key未設定の場合はmock repositoryを使う。画面はどちらの実装でも `TerriRepository` interface だけを見る。

### 5.2 Phase 2

| 操作 | 実装方式 | 用途 |
|---|---|---|
| 友達招待 | Edge Function `issue-friend-invite` | 招待リンク発行 |
| 招待承認 | Edge Function `accept-friend-invite` | Friendship作成 |
| 友達ID検索 | RPC `search_profiles_by_friend_code` / `request_friend_by_code` + auth.uid() | 公開可能なプロフィール最小項目だけを返し、申請作成はDB側で認証ユーザーから導く |
| 友達申請一覧/応答 | RPC `list_incoming_friend_requests` / `list_outgoing_friend_requests` / `respond_friend_request` + auth.uid() | 受信者だけがpending申請を承認/拒否できる。拒否はpending行を削除し、blockedとは分ける |
| 友達一覧 | RPC `list_accepted_friends` + RLS/auth.uid() | accepted friendshipsの公開プロフィール最小項目を返す。ライブ現在地はPresenceから別途扱う |
| 友達ランキング | SQL view/RPC | 友達間の総面積ランキング |
| 友達現在地 | Realtime Presence/Broadcast | 15秒更新、アクティブ状態 |
| 友達陣地表示 | `territories` RPC + friendship認可 | 友達の確定済み陣地表示 |

---

## 6. 常時テリトリー生成とポリゴン生成

### 6.1 データフロー

```text
1. mobile: アプリ起動または復帰時に位置情報権限とテリトリー生成設定を確認
2. mobile: 許可済みなら現在地を取得し、S04 map centerと現在地マーカーへ反映
3. mobile/db: daily_activitiesに当日openレコードを冪等に作成
4. mobile: foreground watcherで位置更新を購読し、精度50m未満かつ5秒経過または10m移動した点だけlocation_pointsへ保存
5. mobile: location_sharing_enabled=trueの場合だけRealtime Presenceに最新位置を送る
6. mobile: ローカルで簡易バッファポリゴンを生成し、半透明live previewを表示
7. RPC: sync_live_territoryが保存済みGPS点を検証し、territories(state='live')をupsert
8. db: daily_activitiesのdistance_m/area_m2/point_countを更新
9. RPC: finalize_daily_activityが日付変更後にterritories(state='final')を保存
10. mobile: S04に位置情報状態、領土化状態、今日の獲得見込み、確定済み陣地を表示
```

S04の地図中心は現在地を優先する。位置情報未許可、端末サービスOFF、または取得不可の場合だけ`SHIBUYA_CENTER`をfallbackとして使い、ユーザーには位置情報をONにする案内を表示する。現在地マーカーと地図中心の更新は、GPS点保存やlive同期の成否から独立させる。これにより、DB/RPC側の一時失敗であっても、位置情報取得に成功している限りユーザーは現在地を確認できる。位置情報取得、精度正規化、GPS点保存、同期は`tracking` featureの責務であり、`MapSurface`は`center`、`currentLocation`、`currentUser`をpropsで受け取って描画するだけにする。`MapSurface`は`expo-location`やrepositoryをimportしない。

foreground watcherは端末から高頻度に位置更新を受けるが、永続化は`trackingPolicy`で制御する。`accuracy_m >= 50`の点は保存しない。最後に保存した点から5秒以上経過、または10m以上移動した場合だけ`appendLocationPoint`へ送る。保存済み点が増えた場合、`sync_live_territory`は30秒以上の間隔を空けて自動実行し、手動同期はこの間隔とは独立して実行できる。

### 6.2 live同期/日次確定アルゴリズム

live同期は`sync_live_territory` RPC、日次確定は`finalize_daily_activity` RPCで呼び出す。RPCは`auth.uid()`を使って所有者を検証し、PostGISでGPS検証、距離、live/final polygonを計算する。Edge Functionsは外部API連携やRPCだけでは扱いにくい複数サービス処理へ限定する。

1. DailyActivityの所有者が`auth.uid()`と一致することを確認する。
2. GPS点を時系列で取得する。
3. `accuracy_m >= 50`の点は計算対象から外す。ただし監査・履歴表示のため`accepted_for_geometry = false`で保存は可能。
4. 異常速度、重複点、極端なジャンプを除外する。
5. 軌跡LineStringに30mバッファを適用する。
6. GPS点が20点以上、かつ開始点から500m以内に戻った場合、コンケーブハル相当の処理で内側面積を加える。
7. 表示用にポリゴンを簡略化する。
8. live同期では`territories(state='live')`へupsertし、日次確定では`territories(state='final')`へ保存する。

実装メモ:

- バッファ、面積、GeoJSON変換はPostGIS優先。
- コンケーブハルはPostGIS関数で要件を満たせるか検証し、不足があればJSライブラリをEdge Function側で使う。
- サーバー側のlive/final値を正とし、クライアントプレビューはUX用に限定する。

### 6.3 クライアントプレビュー

クライアントのプレビューはUX用であり、確定値ではない。サーバー確定後に数値や形状が多少変わることを許容する。UIでは「獲得見込み」相当の扱いにする。

---

## 7. リアルタイム現在地

### 7.1 Supabase Realtime Presence

友達現在地はDBに保存せず、Realtime Presence/Broadcastで短期配信する。

Presence payload:

```ts
type PresenceState = {
  userId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  isActive: boolean;
  avatarUrl?: string;
  displayName: string;
  territoryColor: string;
  locationSharingEnabled: boolean;
};
```

責務:

| 責務 | 詳細 |
|---|---|
| 最新現在地の配信 | 友達現在地表示用。Postgresには保存しない |
| active状態 | 位置情報共有ONかつ領土化中に移動している場合は`isActive = true` |
| TTL/鮮度判定 | クライアント側で30分以上更新がない場合はoffline扱い |
| 共有OFF反映 | `location_sharing_enabled = false`ならpresenceを送らず、購読側にも返さない |
| 友達制限 | チャンネル設計またはBroadcast認可で友達以外に流さない |

### 7.2 配信方式

Phase 2初期はSupabase Realtime Presenceを採用し、要件どおり15秒ごとに最新位置を更新する。Postgres Changesで現在地テーブルを購読する方式は、位置履歴を保存しない方針と衝突するため採用しない。

チャンネル設計は初期実装時に以下のどちらかを選ぶ。

| 案 | 内容 | 判断 |
|---|---|---|
| user scoped channel | `presence:user:{userId}`に本人が送信し、友達が認可付きで購読 | 友達単位の制御がしやすい |
| friend graph channel | 友達グループ単位のchannelにpresenceを送る | 実装は楽だが権限設計が難しくなりやすい |

初期はuser scoped channelを優先する。

---

## 8. Mobile UI構造

画面はS04メインマップを常設ベースにする。タブバーは置かず、ボトムシートとモーダルで遷移する。

```text
S01 Splash/AuthGate
  -> S02 Onboarding
  -> S03 Login
  -> S04 MainMap
       + S05 TrackingOverlay
       + S06 CompleteBottomSheet
       + S07 HistoryBottomSheet
       + S08 ActivityDetailModal
       + S09 RankingBottomSheet
       + S10 FriendsModal
       + S11 ProfileModal
```

Feature単位の責務:

| Feature | 責務 |
|---|---|
| `auth` | Supabase Auth、OAuth、セッション保持、AuthGate |
| `map` | Mapbox初期化、ポリゴンレイヤー、友達マーカー、地名表示 |
| `tracking` | GPS permission、現在地取得、領土化状態、送信間隔制御、プレビュー、Presence更新 |
| `activities` | 日次履歴、詳細、live/final結果 |
| `friends` | 友達一覧、招待、友達現在地購読 |
| `ranking` | 友達間ランキング |
| `profile` | 表示名、絵文字、陣地色、位置共有ON/OFF |
| `share` | Instagram Stories風シェアカード生成 |

---

## 9. 認証・認可・プライバシー

| 項目 | 方針 |
|---|---|
| 認証 | Supabase Authを採用し、Expo/React NativeでOAuthまたはメール認証を扱う |
| 認可 | Postgres RLSで本人データと友達データの閲覧範囲を制御する |
| サーバー処理 | Edge FunctionsではJWTを検証し、`auth.uid()`相当のユーザーだけ処理する |
| 友達データ | 友達関係が`accepted`の場合のみランキング・陣地・現在地を返す |
| 友達申請 | 申請作成、承認、拒否はRPC経由で実行する。`friendships` の直接insert/updateは許可しない |
| 現在地共有 | OFFならRealtime Presenceを送信しない。既存presenceも可能な範囲で退室/上書きする |
| 自分の履歴 | DailyActivity用GPS点は自分の履歴としてPostgresに保存する |
| 友達の履歴 | 保存しない。取得時点のpresenceだけを返す |
| RLS | exposed schemaのテーブルは必ずRLSを有効化する |

---

## 10. 開発フェーズ

### Phase 1: Single User Core

目的: 単一ユーザーで「歩く、陣地ができる、履歴で見られる」を完成させる。

実装範囲:

- Expoアプリ基盤
- Supabase Auth
- S01〜S08
- Mapbox表示
- 常時テリトリー生成
- Supabase migration
- PostGIS schema
- RLS
- DailyActivity/LocationPoint/Territory
- RPC `sync_live_territory`
- RPC `finalize_daily_activity`
- サーバーlive/finalポリゴン生成
- クライアントプレビュー

### Phase 2: Social

目的: 友達との競争と存在感を成立させる。

実装範囲:

- 友達追加/招待リンク
- Friendship RLS/RPC
- フレンドランキング
- Supabase Realtime Presence
- 友達現在地表示
- S09〜S11
- Supabase Storageでアバター管理

### Phase 3: AI

目的: 行動文脈に基づく移動アドバイスを追加する。

実装範囲:

- Supabase Edge Functionsから外部AI APIを呼び出す
- DailyActivity/territory/contextから提案生成
- 提案履歴または一時表示

---

## 11. 初期実装順序

1. Monorepo、TypeScript、lint/test、pnpm workspaceを作る。
2. ExpoアプリとSupabase client設定を作る。
3. Supabase migrationでPostGIS、profiles、daily_activities、location_points、territoriesを作る。
4. RLSを有効化し、本人データだけ読める/書ける状態にする。
5. `packages/shared`にschemaと型を作る。
6. `packages/geo`にGPSフィルタ、距離、プレビュー、territory builderのテストを作る。
7. `sync_live_territory` と `finalize_daily_activity` RPCを作る。
8. `apps/mobile`にMapbox表示、位置情報/領土化状態、GPS保存を作る。
9. S04/S07/S08でlive結果、日次確定結果、履歴を表示する。
10. Phase 2用にfriendship schema、ranking view、presence設計を追加する。

---

## 12. 初期ADR

### ADR-001: MobileはExpoを採用する

位置情報、バックグラウンド実行、SNSログイン、iOS/Androidの配布を考えるとWebアプリでは要件を満たしにくい。Phase 1からExpoを採用する。

### ADR-002: 主バックエンドはSupabaseを採用する

TERRIの中核は位置情報データの保存、ポリゴン計算、面積計算、友達範囲での集計である。Postgres/PostGIS、Auth、RLS、Realtime、Storageが一体になっているSupabaseの方がMVPの実装速度と正確性を両立しやすい。

### ADR-003: 確定ポリゴンはサーバーを正とする

クライアント計算だけでは改ざん、端末差、ライブラリ差を吸収できない。クライアントはUX用プレビュー、PostGIS RPC側は確定値という役割に分ける。

### ADR-004: 友達現在地はPostgresに保存しない

友達現在地はリアルタイム存在感のためのデータであり、履歴資産ではない。プライバシー保護のためSupabase Realtime Presence/Broadcast上の短期状態に限定する。

### ADR-005: RLSを前提に直接DBアクセスとEdge Functionを使い分ける

単純な本人CRUDは`supabase-js`からRLS付きで直接アクセスする。liveテリトリー同期と日次確定はPostGIS RPCへ寄せ、友達招待や外部サービス連携などserver-only secretや複数サービス処理が必要なものはEdge Functionへ寄せる。

### ADR-006: Cloudflareは初期採用しない

Cloudflare Durable Objectsは超低遅延の協調状態に強いが、初期TERRIの主要リスクは地理空間データと権限制御である。SupabaseでPhase 1/2を作り、Realtimeの限界が見えた段階でpresence専用のCloudflare導入を検討する。
