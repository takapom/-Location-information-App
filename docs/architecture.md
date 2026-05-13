# TERRI Architecture

> 対象要件: `移動距離連動型陣取り位置情報アプリ「TERRI」 最終要件定義書.md` v1.1  
> 方針: 位置情報アプリとしての第一原理に基づき、主バックエンドをSupabaseへ変更する。Cloudflareは中核バックエンドとして初期採用せず、本番地図配信にも採用しない。将来の超低遅延リアルタイム要件が出た場合のみ拡張候補として再検討する。本番地図style / tile配信はADR 0010に従いSupabase Storage + Supabase Edge Functionで完結させる。

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
| 本番地図配信は継続運用が必要 | PMTiles、style、glyph、sprite、TileJSON/MVTをTERRI管理下で配信する必要がある | Supabase Storageに地図assetを置き、Edge Function `map-tiles` でHTTPS配信する |

---

## 2. 採用アーキテクチャ

```text
Expo Mobile App
  - GPS取得
  - MapSurfaceによる実地図描画
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
               - map-tiles TileJSON / MVT / static asset delivery
```

### 2.1 技術スタック

| 領域 | 採用 | 理由 |
|---|---|---|
| Mobile | Expo + React Native + TypeScript | GPS、通知、SNSログイン、iOS/Android配布を現実的に扱える |
| Map | MapSurface facade + MapScene + Native MapLibre React Native / Web Leaflet短期維持 | S04は現在地の実地図、自由なpan/zoom、ポリゴン、友達マーカーを必須にする。画面は `buildHomeMapScene` で描画ViewModelを作り、地図エンジン差し替えを `MapSurface` adapterへ閉じ込める。本番tileはself-hosted vector style URLを使い、OSM公式tileはdev fallbackに限定する |
| Backend Platform | Supabase | Auth、Postgres、Realtime、Storage、Edge Functionsを一体で扱える |
| Database | Supabase Postgres + PostGIS | 位置情報、ポリゴン、面積、近傍検索、空間インデックスに強い |
| Auth | Supabase Auth | Expo/React Nativeから扱いやすく、RLSと連動できる |
| Authorization | Postgres Row Level Security | 本人データ・友達データの境界をDB側でも強制できる |
| Realtime/Presence | Supabase Realtime Presence/Broadcast | 友達現在地・アクティブ状態の短期配信に使える |
| Storage | Supabase Storage | アバター、シェア用画像、将来のメディア保存、PMTiles / style / glyph / spriteの本番地図asset保存に使える |
| Server Logic | Postgres RPC + Supabase Edge Functions | PostGISで完結する本人スコープ処理はRPC、外部API連携やserver-only secretが必要な処理、本番地図配信の `map-tiles` はEdge Functionsに分ける |
| Validation | Zod | mobile/functions/sharedで同じスキーマを使える |
| Geometry | PostGIS + Turf.js系ラッパー | 永続データはPostGIS、クライアントプレビューは軽量JSで処理する |
| Monorepo | pnpm workspaces想定 | mobile/shared/geo/functionsの型とロジックを共有する |

### 2.2 Cloudflareを初期採用しない理由

Cloudflare Workers/Durable Objectsは低遅延リアルタイム協調に強い。一方で、TERRIの中核は「地理空間データの保存・計算・検索」であり、D1/SQLite中心にするとPostGIS相当の能力をアプリケーション側で補う必要がある。MVPではこの実装負荷が高く、チート検知・面積計算・ランキング集計の正確性も担保しづらい。

この節の「初期採用しない」は、Auth、永続データ、PostGIS計算、RLS、Realtime Presenceなどの中核バックエンドをCloudflare中心にしない、という意味である。ユーザー方針変更により、本番地図style / tile配信についてもCloudflare R2 + Workerは採用しない。ADR 0010に従い、Supabase StorageにPMTiles / style / glyph / spriteを保存し、Supabase Edge Function `map-tiles` がHTTPSのTileJSON / MVT / static assetを配信する。

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
        loop-preview.ts            # 閉じたループのクライアント用軽量プレビュー
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
| Ranking | 友達間ランキング。総面積順位と直近7日対前7日のdeltaをRPC内で都度集計する |

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
| GPS点送信 | `location_points` insert RPC or batched insert | foreground watcherで位置更新を受け、`accuracy_m < 50`かつ5秒経過または10m移動した点を保存対象にする。Repository/Supabase境界で低精度点を受けた場合もgeometry計算から除外する |
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
EXPO_PUBLIC_SUPABASE_ANON_KEY=<supabase statusで表示されるPublishable key>
```

`EXPO_PUBLIC_TERRI_DATA_SOURCE=mock`、またはPublishable key未設定の場合はmock repositoryを使う。画面はどちらの実装でも `TerriRepository` interface だけを見る。

### 5.2 Phase 2

| 操作 | 実装方式 | 用途 |
|---|---|---|
| 友達招待 | Edge Function `issue-friend-invite` | 招待リンク発行 |
| 招待承認 | Edge Function `accept-friend-invite` | Friendship作成 |
| 友達ID検索 | RPC `search_profiles_by_friend_code` / `request_friend_by_code` + auth.uid() | 公開可能なプロフィール最小項目だけを返し、申請作成はDB側で認証ユーザーから導く |
| 友達申請一覧/応答 | RPC `list_incoming_friend_requests` / `list_outgoing_friend_requests` / `respond_friend_request` + auth.uid() | 受信者だけがpending申請を承認/拒否できる。拒否はpending行を削除し、blockedとは分ける |
| 友達一覧 | RPC `list_accepted_friends` + RLS/auth.uid() | accepted friendshipsの公開プロフィール最小項目を返す。ライブ現在地はPresenceから別途扱う |
| 友達ランキング | RPC `list_friend_rankings` + auth.uid() | 本人とaccepted友達だけを対象に `daily_activities.area_m2` の総面積で順位付けする。`delta_area_m2` は直近7日合計からその前7日合計を引いた前週比としてDB側で計算する |
| 友達現在地 | Realtime Presence/Broadcast | 15秒更新、アクティブ状態 |
| 友達陣地表示 | RPC `list_friend_territories` + auth.uid() | accepted友達の `territories(state='final')` だけをGeoJSONで返す。自分のlive previewとは別レイヤーで表示する |

---

## 6. 常時テリトリー生成とポリゴン生成

### 6.1 データフロー

```text
1. mobile: アプリ起動または復帰時に位置情報権限とテリトリー生成設定を確認
2. mobile: 許可済みなら現在地を取得し、S04 map centerと現在地マーカーへ反映
3. mobile/db: daily_activitiesに当日openレコードを冪等に作成
4. mobile: foreground watcherで位置更新を購読し、`accuracy_m < 50`かつ5秒経過または10m移動した点をlocation_pointsへ保存対象にする
5. mobile: location_sharing_enabled=trueの場合だけRealtime Presenceに最新位置を送る
6. mobile: 保存対象になった軌跡線を表示し、任意の過去地点から500m以内に戻った閉じたループだけ半透明live previewとして塗る
7. RPC: sync_live_territoryが保存済みGPS点を検証し、territories(state='live')をupsert
8. db: daily_activitiesのdistance_m/area_m2/point_countを更新
9. RPC: finalize_daily_activityが日付変更後にterritories(state='final')を保存
10. mobile: S04に位置情報状態、領土化状態、今日の獲得見込み、確定済み陣地を表示
```

S04の地図中心は現在地を優先する。位置情報未許可、端末サービスOFF、または取得不可の場合だけ`SHIBUYA_CENTER`をfallbackとして使い、ユーザーには位置情報をONにする案内を表示する。現在地マーカーと地図中心の更新は、GPS点保存、プロフィール取得、領土化ON/OFF、live同期の成否から独立させる。これにより、DB/RPC側の一時失敗や領土化停止中であっても、位置情報取得に成功している限りユーザーは現在地を確認できる。位置情報取得、精度正規化、GPS点保存、同期は`tracking` featureの責務であり、`HomeMapScreen` は `buildHomeMapScene` で `MapScene` を合成して `MapSurface` に渡す。`MapSurface`は`expo-location`やrepositoryをimportしない。

foreground watcherは端末から高頻度に位置更新を受けるが、永続化は`trackingPolicy`で制御する。`accuracy_m >= 50`の低精度点は通常のクライアント送信前に落とす。最後に保存した点から5秒以上経過、または10m以上移動した場合だけ`appendLocationPoint`へ送る。Repository/Supabase境界で低精度点を受けた場合も、`accepted_for_geometry=false`または同期時フィルタにより距離・ループ・面積計算から除外する。保存済み点が増えた場合、`sync_live_territory`は30秒以上の間隔を空けて自動実行し、手動同期はこの間隔とは独立して実行できる。

### 6.2 live同期/日次確定アルゴリズム

live同期は`sync_live_territory` RPC、日次確定は`finalize_daily_activity` RPCで呼び出す。RPCは`auth.uid()`を使って所有者を検証し、PostGISでGPS検証、距離、live/final polygonを計算する。Edge Functionsは外部API連携やRPCだけでは扱いにくい複数サービス処理へ限定する。

1. DailyActivityの所有者が`auth.uid()`と一致することを確認する。
2. GPS点を`recorded_at`昇順で取得する。
3. `accuracy_m >= 50`の点は計算対象から外す。通常のクライアント送信では保存前に除外し、Repository/Supabase境界で受けた場合も`accepted_for_geometry=false`または同期時フィルタで距離・ループ・面積計算から除外する。
4. `speed_mps > 15`の高速点、速度未取得以外の異常速度、重複点、極端なジャンプを除外する。
5. 直線移動は距離と軌跡として扱い、単独では面積にカウントしない。
6. 任意の過去地点から500m以内に戻った場合、その区間を閉じたループ候補として扱う。
7. 1回の移動中に複数ループが成立した場合は、重複しすぎる候補を除き、成立したループをすべてテリトリー化する。前のループ終端と次のループ始点が同じ共有端点になる連続ループは許可する。
8. MVPでは有効GPS点4点以上、ループ距離100m以上、面積100m²以上、PostGISでvalidなpolygonだけを面積化する。
9. 表示用にポリゴンを簡略化する。
10. live同期では`territories(state='live')`へupsertし、STOP時の`finalize_daily_activity`で`territories(state='final')`へ保存する。

実装メモ:

- ループ判定、面積、GeoJSON変換はPostGIS優先。
- クライアントは同じ閾値の軽量ループプレビューを持ち、閉じた瞬間にユーザーのテリトリーcolorで塗る。
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
  position: {
    latitude: number;
    longitude: number;
  };
  updatedAt: string;
  isActive: boolean;
  locationSharingEnabled: boolean;
  accuracyM?: number;
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

チャンネル設計は `presence:user:{userId}` のuser scoped private channelを採用する。

| 案 | 内容 | 判断 |
|---|---|---|
| user scoped channel | `presence:user:{userId}`に本人が送信し、友達が認可付きで購読 | 採用。本人だけがinsert/trackでき、本人またはaccepted友達だけがselect/subscribeできる |
| friend graph channel | 友達グループ単位のchannelにpresenceを送る | 非採用。実装は楽だが権限設計が難しくなりやすい |

Realtime private channel authorizationは `realtime.messages` のRLS policyで強制する。`presence:user:{userId}` topicから対象userを取り出し、Presenceのreadは本人または `friendships.status = 'accepted'` の友達だけ、trackはtopicの本人だけに限定する。表示名、色、総面積はPresence payloadではなく `list_accepted_friends()` のプロフィール一覧を正とし、Presenceは位置、鮮度、active状態だけをS04へmergeする。

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
| `map` | MapSurface facade、MapScene生成、現在地中心の実地図、pan/zoom可能な地図操作、ポリゴンレイヤー、友達マーカー、地名/chrome表示 |
| `tracking` | GPS permission、現在地取得、領土化状態、送信間隔制御、プレビュー、Presence更新 |
| `activities` | 日次履歴、詳細、live/final結果 |
| `friends` | 友達一覧、招待、友達現在地購読 |
| `ranking` | 友達間ランキング |
| `profile` | 表示名、絵文字、陣地色、位置共有ON/OFF |
| `share` | Instagram Stories風シェアカード生成 |
| `lib/realtime` | Presence client境界。noop/mockとSupabase Realtime実装を差し替える |
| `lib/repositories` | mock/Supabase repository切替 |
| `lib/supabase` | Supabase client、Supabase repository、Supabase Presence client |

### 8.1 MapSurface境界

S04の地図は `apps/mobile/src/components/map/MapSurface` を描画facadeにする。画面やfeature hookはSupabase client、repository、GPS取得を `MapSurface` へ持ち込まない。`HomeMapScreen` はrepository / tracking hook / friend presenceから必要なデータを取得し、`apps/mobile/src/features/map/services/buildHomeMapScene.ts` で `MapScene` へ変換して `MapSurface` へ渡す。移行期間だけ `center`、`currentLocation`、`friends`、`friendTerritories`、`live`、`showRoute` などの既存propsも残すが、描画契約は `scene` を優先する。

`MapScene` は `viewport`、`user.marker`、`layers.ownFinalTerritories`、`layers.friendFinalTerritories`、`layers.livePreview`、`layers.trackingRoute`、`layers.friends`、`chrome.placeLabel`、`chrome.activeFriendCount`、`chrome.privacyLabel`、`chrome.attribution` を持つ。TERRIドメインデータを直接MapLibre adapterへ渡さず、Native/Webで同じ描画ViewModelを共有する。

Map style / tile設定は `apps/mobile/src/components/map/config` に閉じる。`mapStyleConfig` は `EXPO_PUBLIC_MAP_ENV`、`EXPO_PUBLIC_MAP_TILE_MODE`、`EXPO_PUBLIC_MAP_STYLE_URL`、`EXPO_PUBLIC_MAP_ATTRIBUTION`、`EXPO_PUBLIC_MAP_DEBUG_ALLOW_OSM_TILES` を読む。`NODE_ENV=production` は本番地図運用として扱うが、Release構成の実機検証では `EXPO_PUBLIC_MAP_ENV=development` で明示的に上書きする。`mapStyleFactory` は開発中のOSM raster fallback style、または本番のself-hosted vector style URLを返す。`mapStyleGuards` はproductionで `tile.openstreetmap.org` を参照しないこと、attributionが空でないこと、self-hosted modeでstyle URLが設定されていることを検証する。ADR 0009のdev build用OSM raster styleはADR 0010によりdev fallbackへ限定される。

本番地図基盤はADR 0010に従い、Protomaps BasemapのPMTiles archive、style JSON、glyph、spriteをSupabase Storageへ置き、Supabase Edge Function `map-tiles` でHTTPSのTileJSON / ZXY MVT / static asset endpointとして配信する。`EXPO_PUBLIC_MAP_STYLE_URL` は `map-tiles` が返すTERRI管理style JSONを指し、mobileはHTTPS style URLだけを見る。style JSONは `pmtiles://` ではなくHTTPSのTileJSONまたは `tiles` URL templateを参照する。これはNative MapLibreとの互換性を優先するためである。`map-tiles` は `MAP_TILES_PUBLIC_BASE_URL` からTileJSON内の外向きtile URLを組み立て、Supabase Edge Runtimeやcustom domainの内部originをmobileへ漏らさない。style JSON、glyph、sprite、tile endpointは同じTERRI管理originに寄せ、productionではOSM公式tile、Protomaps GitHub assets、provider無料枠へのhotlinkをcore pathにしない。Cloudflare R2 + Workerは本番地図配信にも採用しない。Webを本番公開する場合は、Leaflet + OSM rasterのままではなく、MapLibre GL JSへ移行して同じstyle URLを読む。

Nativeは最終的に `@maplibre/maplibre-react-native` を `MapSurface.native.tsx` に閉じ込める。MapLibre native moduleを使うため、iOS/Android実機確認はExpo Goではなくdev build/prebuildを前提にする。ただし2026-05-06時点ではRelease実機でMapLibre描画時にnative crashが再現しているため、Nativeは一時的に `react-native-maps` のiOS標準地図でpan/pinch zoomを提供する。`MapSurface` には `MapScene` だけを渡し、GPS取得、repository、Supabase呼び出しは入れない。GeoJSON FeatureCollection生成は `layers/mapFeatureCollections.ts`、source/layer idは `layers/mapLayerIds.ts`、paint/layoutは `layers/mapLayerStyles.ts` に分離したまま残し、実機ログを取れる状態でMapLibreをレイヤー単位に段階復旧する。live previewなどのPolygon ringはMapLibreへ渡す前に必ず閉じる。

Web MVPは短期的にLeafletを維持する。OSM raster tileはdev fallback config経由でのみ使い、end-stateではMapLibre GL JSへ移行してNativeと同じself-hosted vector style URL、source/layer思想、MapScene契約へ寄せる。Zenly風の表現はタイルの彩度調整、アバターマーカー、友達限定チップ、陣地ポリゴンなどのレイヤー/オーバーレイで表現し、地図本体のdrag/zoom/touch操作を妨げない。ユーザーが一度地図をdrag/zoomした後は、同一画面内の位置情報更新で自動的に現在地へ戻さない。

AttributionはMapLibre/Leaflet標準UIに依存しない。`MapChrome` がplace label、active friend pill、privacy pill、`MapAttribution` を担当し、地図SDK adapterは地図本体、camera、source/layer、markerへ限定する。OSM由来データを使う限り `chrome.attribution` は常時表示する。

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
- MapSurfaceによる現在地実地図表示
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
8. `apps/mobile`にMapSurface表示、位置情報/領土化状態、GPS保存を作る。
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

Cloudflare Durable Objectsは超低遅延の協調状態に強いが、初期TERRIの主要リスクは地理空間データと権限制御である。SupabaseでPhase 1/2を作り、Realtimeの限界が見えた段階でpresence専用のCloudflare導入を検討する。本番地図tile配信についてもCloudflare R2 + Workerは採用せず、ADR 0010に従ってSupabase Storage + Edge Function `map-tiles` に集約する。
