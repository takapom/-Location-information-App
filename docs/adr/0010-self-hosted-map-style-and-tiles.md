# ADR 0010: Supabase Storage + Edge Function + Protomaps PMTilesで本番地図style / tilesを配信する

## ステータス

承認

## コンテキスト

S04メインマップはTERRIの中心体験であり、現在地、友達アバター、友達ライブ現在地、自分と友達の確定済み陣地、live preview、tracking route、privacy chromeを同じ地図上で扱う。

ADR 0009ではNativeを `@maplibre/maplibre-react-native` へ接続し、画面・hook・repositoryは `MapSurface` propsだけに依存する方針を採用した。一方で、開発用のbase styleは `https://tile.openstreetmap.org/{z}/{x}/{y}.png` を直接参照していた。OpenStreetMap公式tile serverは開発中のfallbackとしては便利だが、本番アプリの恒久的な無料インフラとして依存しない。

本番では、TERRI側で可用性、cache、利用量、style変更、attributionを制御できる地図配信基盤が必要である。Native MapLibreとの互換性を優先するため、アプリに `pmtiles://` protocolを要求せず、通常のHTTPS TileJSON / ZXY MVT endpointとして配信する。

ユーザー方針変更により、Cloudflareは地図配信にも採用しない。TERRIの現在のtech stackであるSupabase + Expoを主軸にし、地図asset保存と配信もSupabase Storage + Supabase Edge Functionへ寄せる。

## 検討した選択肢

### 選択肢A: OSM公式raster tileを本番でも使い続ける

- 利点: 実装変更が小さい、API keyが不要、開発確認が速い。
- 欠点: OSM公式tileはbest-effortでSLAがなく、heavy/inappropriate useはブロックされ得る。offline/prefetchや恒久的な商用core pathには向かない。
- 採用可否: 不採用。ただし開発中の `dev-osm-raster` fallbackとしてのみ許可する。

### 選択肢B: MapTiler Cloud / Stadia Maps / Mapboxなどのhosted providerを本番core pathにする

- 利点: 初期セットアップが楽で、style、CDN、glyph、sprite運用を任せられる。
- 欠点: MAU、map load、request数、商用条件による課金・制限がTERRIのcore体験へ直結する。provider tokenもアプリ配布面の管理対象になる。
- 採用可否: 不採用。障害時または実機検証用の一時fallback候補には残す。

### 選択肢C: Protomaps PMTilesをCloudflare R2へ置き、WorkerでZXY MVT / TileJSONとして配信する

- 利点: OSM由来のvector basemapをTERRI管理のdomainで配信できる。PMTilesは単一archiveなので、地域extractから始めやすい。
- 欠点: Cloudflare Worker、R2、custom domain、cache、deploy権限、運用監視がSupabaseとは別の補助インフラになる。Cloudflareを主backendとして採用しない既存方針と運用面で分断が残る。
- 採用可否: 不採用。ADR proposal 0010ではこの案を採用候補にしていたが、承認済みADRでは採用しない。

### 選択肢D: Supabase StorageへPMTiles / style / glyph / spriteを置き、Edge Function `map-tiles` で配信する

- 利点: 既存tech stackのSupabase + Expoだけで本番地図配信を完結できる。Auth、Storage、Edge Functions、環境変数、運用権限をSupabaseに集約でき、Cloudflare補助インフラを増やさない。PMTilesは単一archiveなので、地域extractから始めやすい。
- 欠点: PMTiles range read、MVT response、CORS、Cache-Control、tile not foundの扱い、Storage object versioningをTERRI側で実装・検証する必要がある。グローバルCDN前提の構成よりlatencyとcache効率は実測が必要。
- 採用可否: 採用。

### 選択肢E: OpenMapTiles / Planetiler + TileServer GLをVPSまたはcontainerで運用する

- 利点: 従来型のself-hosted vector tile serverとして理解しやすく、MapLibreとの相性もよい。
- 欠点: 常時稼働server、deploy、scale、disk、monitoring、TLS、cacheの運用負荷がMVPに対して大きい。
- 採用可否: 不採用。Supabase Edge Function配信で性能・機能が足りない場合の置き換え候補に残す。

## 決定

本番地図基盤 v1 は次で進める。

- 地図SDKはMapLibre路線を継続する。
- 本番ではOpenStreetMap公式tile serverを使わない。
- 本番basemap dataはProtomaps Basemap PMTilesを使う。
- 初期配信範囲はTERRIの主要利用地域に絞ったregion extractとし、必要に応じて対象地域またはmaxzoomを拡張する。
- PMTiles archive、style JSON、glyph、spriteはSupabase Storageへ配置する。
- Supabase Edge Function `map-tiles` がStorage上のPMTiles / static assetを読み、`https://<project-ref>.functions.supabase.co/map-tiles/<tileset>.json`、`https://<project-ref>.functions.supabase.co/map-tiles/<tileset>/{z}/{x}/{y}.mvt`、style / glyph / spriteのHTTPS endpointを配信する。
- アプリの `EXPO_PUBLIC_MAP_STYLE_URL` は `map-tiles` が返すTERRI管理style JSONを指す。独自domainを使う場合も、背後の配信責務はSupabase Edge Functionに置く。
- mobileはHTTPS style URLだけを見る。PMTiles archive、Storage path、tile生成・配信の詳細をmobileへ持ち込まない。
- style JSONは `pmtiles://` を使わず、HTTPSのTileJSONまたは `tiles` URL templateを参照する。これはNative MapLibreの互換性を優先するためである。
- style JSON、glyphs、sprites、PMTiles-derived tile endpointは同じTERRI管理originに寄せる。productionでProtomaps GitHub assetsやOSM公式tileへhotlinkしない。
- attributionは `MapChrome` / `MapAttribution` で常時表示し、少なくとも OpenStreetMap contributors を含める。
- cacheはtileset名にversionを含めて管理する。versioned path `/v2026-05-13/...` は採用しない。例: `/basemap-v2026-05-13.json`、`/basemap-v2026-05-13/{z}/{x}/{y}.mvt`、`/styles/terri-v2026-05-13.json`。
- tile更新は当面monthlyまたは手動更新にする。daily自動更新はMVP後の運用改善とする。
- Cloudflare R2 + Workerは採用しない。Cloudflare手順、R2 bucket、Worker deploy、Cloudflare custom domainは本番地図配信の前提にしない。
- Web本番はLeaflet + OSM rasterのまま出さない。Webを本番公開する場合は、MapLibre GL JSへ移行して同じstyle URLを読むか、TERRI管理のraster endpointを別途用意する。

## 本番env

```env
EXPO_PUBLIC_MAP_ENV=production
EXPO_PUBLIC_MAP_TILE_MODE=self-hosted-vector
EXPO_PUBLIC_MAP_STYLE_URL=https://<project-ref>.functions.supabase.co/map-tiles/styles/terri.json
EXPO_PUBLIC_MAP_ATTRIBUTION=© OpenStreetMap contributors
EXPO_PUBLIC_MAP_DEBUG_ALLOW_OSM_TILES=false
```

## 責務分割

```text
Supabase Storage
  - version付きtileset名のPMTiles archive
  - glyph / sprite assets
  - static style JSON

Supabase Edge Function: map-tiles
  - Storage上のPMTiles archiveからTileJSONを返す
  - Storage上のPMTiles archiveからZXY MVTを返す
  - style JSON / glyph / spriteをHTTPSで返す
  - MAP_TILES_PUBLIC_BASE_URLからTileJSON内の外向きtile URLを組み立てる
  - Cache-Control / CORS / content-type / tile not found responseを管理する

Map style JSON
  - vector sourceはHTTPS TileJSONまたはtiles URL templateを参照する
  - glyphs / spriteはmap-tiles配下を参照する
  - TERRIの地図色、label密度、road/water/landuse styleを管理する

apps/mobile/src/components/map/config
  - envを読む
  - productionでdev OSM raster fallbackを拒否する
  - productionでtile.openstreetmap.org参照を拒否する

MapSurface
  - style URLを受け取って地図SDKへ渡す
  - GPS取得、repository、Supabase呼び出しは持たない
```

## 影響

- Mobile:
  - 既存の `EXPO_PUBLIC_MAP_TILE_MODE=self-hosted-vector` と `EXPO_PUBLIC_MAP_STYLE_URL` の方針を維持する。
  - Native MapLibre復旧時も、styleはHTTPS URLとして渡す。
  - 現在の一時的な `react-native-maps` fallbackは、MapLibre crash調査とは別に扱う。
- Web:
  - 本番Web公開前にMapLibre GL JSへ移行する。
  - 開発中のLeaflet + OSM raster fallbackはdevelopment限定のままにする。
- Infra:
  - Supabase Storage bucket、PMTiles upload、style JSON / glyph / sprite upload、Edge Function `map-tiles` deploy、production env設定、curl疎通確認が必要になる。
  - version付きtileset更新手順とrollback手順が必要になる。新旧のtileset名をallowlistに残し、style JSONの参照先を戻すことでrollbackする。
  - Cloudflare R2 + Workerの構築手順は不要であり、実装しない。
- Docs:
  - `docs/architecture.md` のMap style / tile方針をこのADRに合わせて更新する。
- Test:
  - 既存の style config/factory/guard testで、productionのOSM公式tile禁止、attribution必須、self-hosted style URL必須を維持する。
  - `map-tiles` 実装時は、Storage読み取り、TileJSON、MVT response、static asset response、CORS、Cache-Control、存在しないtileの404/204を近いレイヤーで検証する。

## 実装順序

1. `map-tiles` の公開URL方針を決める。Supabase functions URLを直接使うか、TERRI管理domainを割り当てるかを決める。
2. Protomaps Basemapのregion extractを作成する。
3. Supabase Storage bucketへPMTiles、glyph、sprite、style JSONをアップロードする。
4. Supabase Edge Function `map-tiles` を実装し、TileJSON / ZXY MVT / static assetを配信する。
5. `/map-tiles/basemap-v2026-05-13.json` と `/map-tiles/basemap-v2026-05-13/{z}/{x}/{y}.mvt` をcurlで確認する。
6. `terri.json` が同じoriginのTileJSON、glyph、spriteだけを参照することを検証する。
7. `EXPO_PUBLIC_MAP_STYLE_URL` をproduction envへ設定する。
8. iOS/Android dev buildでpan/zoom、label、marker、polygon overlayを実機検証する。

## 未決事項

- Supabase functions URLを直接使うか、TERRI管理domainを割り当てるか。
- 初期region extractの範囲。
- 初期maxzoom。
- Storage bucket名とobject path規約。
- `map-tiles` をTERRI repo内の `supabase/functions/map-tiles` で管理する前提の詳細。
- 月次更新を手動にするか、CI/CDにするか。
- MapLibre復旧までのNative production fallback方針。

## 備考

- 作成日: 2026-05-13
- 更新日: 2026-05-13
- 関連ADR:
  - `docs/adr/0006-zenly-style-map-engine.md`
  - `docs/adr/0009-native-maplibre-map-surface.md`
  - `docs/adr-proposals/0010-self-hosted-map-style-and-tiles.md`
- ADR proposal 0010はCloudflare R2 + Worker案を含む実装前方針として残す。ただし、承認済みADR 0010ではユーザー方針変更によりSupabase Storage + Edge Function案へ置き換え、Cloudflareは本番地図配信に採用しない。
- 関連ファイル:
  - `docs/architecture.md`
  - `apps/mobile/.env.example`
  - `apps/mobile/src/components/map/config/mapStyleConfig.ts`
  - `apps/mobile/src/components/map/config/mapStyleFactory.ts`
  - `apps/mobile/src/components/map/config/mapStyleGuards.ts`
  - `apps/mobile/src/components/map/MapSurface.native.tsx`
  - `apps/mobile/src/components/map/MapSurface.web.tsx`
- 参照資料:
  - OpenStreetMap Tile Usage Policy: `https://operations.osmfoundation.org/policies/tiles/`
  - Protomaps PMTiles concepts: `https://docs.protomaps.com/pmtiles/`
  - Protomaps Basemap downloads: `https://docs.protomaps.com/basemaps/downloads`
  - Protomaps Basemaps for MapLibre: `https://docs.protomaps.com/basemaps/maplibre`
  - MapLibre Style Spec sources: `https://maplibre.org/maplibre-style-spec/sources/`
  - MapLibre React Native VectorSource: `https://maplibre.org/maplibre-react-native/docs/components/sources/vector-source/`
