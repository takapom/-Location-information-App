# ADR Proposal 0010: MapLibreとself-hosted map style / tilesを前提にした地図基盤へ移行する

## ステータス

提案済み

## コンテキスト

S04メインマップはTERRIの中心体験であり、現在地、友達アバター、友達ライブ現在地、自分と友達の確定済み陣地、live preview、tracking route、privacy chromeを同じ地図上で扱う。

ADR 0009ではNativeを `@maplibre/maplibre-react-native` へ接続し、画面・hook・repositoryは `MapSurface` propsだけに依存する方針を採用した。一方で、Nativeのbase styleは `https://tile.openstreetmap.org/{z}/{x}/{y}.png` を直接参照していた。OpenStreetMap公式tile serverは開発中のfallbackとしては便利だが、本番アプリの恒久的な無料インフラとして依存しない。

## 検討した選択肢

### 選択肢A: OSM公式raster tileを本番でも使い続ける

- 利点: 実装変更が小さい、API keyが不要、開発確認が速い。
- 欠点: 本番の恒久利用前提として不適切、SLAや可用性をTERRI側で制御できない、公共リソースへ負荷をかける、style/tile責務がadapterに残る。
- 採用可否: 不採用。ただし開発中のdev fallbackとしてのみ許可する。

### 選択肢B: Mapbox / Google Maps / MapTiler Cloud / Stadia Mapsなどの無料枠を使う

- 利点: 初期セットアップが比較的簡単で、styleやCDN運用が楽。
- 欠点: 無料枠は永続無料運用の保証ではなく、MAU、map load、request数、商用条件による課金リスクがある。
- 採用可否: 不採用。TERRIのcore pathを外部API無料枠へ依存させない。

### 選択肢C: MapLibreを維持し、開発中だけOSM raster、本番はself-hosted vector tileへ移行する

- 利点: ADR 0006/0009のMapSurface境界を活かせる。Mapbox tokenを必須にせず、本番ではOSM由来データのtile配信をTERRI側で制御できる。
- 欠点: self-hosted tile基盤、style JSON、cache、bandwidth、Web MapLibre移行の運用設計が必要。
- 採用可否: 採用。

## 決定

- 地図SDKはMapLibre路線を継続する。
- 本番ではOpenStreetMap公式tile serverを使わない。
- 開発中のみ `dev-osm-raster` fallbackとしてOSM公式raster tileを許可する。
- 本番は `EXPO_PUBLIC_MAP_ENV=production`、`EXPO_PUBLIC_MAP_TILE_MODE=self-hosted-vector`、`EXPO_PUBLIC_MAP_STYLE_URL` でself-hosted vector style JSONを指定する。
- attributionはSDK標準UIへ依存せず、`MapChrome` / `MapAttribution` で常時表示する。
- `HomeMapScreen -> buildHomeMapScene -> MapScene -> MapSurface` の順で描画ViewModelを渡し、MapLibre固有コードは `apps/mobile/src/components/map` 配下へ閉じる。

## 責務分割

```text
HomeMapScreen
  - repository / hook / presence から必要データを取得
  - buildHomeMapSceneを呼ぶ
  - MapSurfaceへsceneを渡す

buildHomeMapScene
  - TERRIドメインデータをMapSceneへ変換
  - visible friend presence、friend final territory、live preview、tracking route、chromeを合成

MapSurface
  - platform非依存facade
  - 移行期間は既存propsも受けるがsceneを優先する

MapSurface.native / MapSurface.web
  - NativeはMapLibre primitive、Webは短期Leaflet adapter
  - style URL決定、GeoJSON変換、chrome組み立てを抱えない

config/mapStyleConfig
  - envからtile mode、style URL、attribution、OSM fallback可否を読む

config/mapStyleFactory
  - dev fallback style objectまたはproduction style URLを返す

config/mapStyleGuards
  - productionでOSM公式tile参照、attribution漏れ、self-hosted style URL漏れを拒否する
```

## 影響

- Mobile:
  - `MapSurface` は `scene?: MapScene` を優先して描画する。
  - Nativeは `mapStyleFactory` の結果を `Map` に渡す。
  - Webは短期的にLeafletを維持するが、OSM raster tileはdev fallback config経由でだけ使う。
  - GeoJSON FeatureCollection、layer id、layer styleを責務別ファイルへ分離する。
- Docs:
  - `docs/architecture.md` のMapSurface境界とMap style/tile方針を更新する。
- Test:
  - style config/factory/guard、FeatureCollection、buildHomeMapScene、MapChrome/Attributionを近いレイヤーで検証する。

## 運用前提

開発中:

```env
EXPO_PUBLIC_MAP_TILE_MODE=dev-osm-raster
EXPO_PUBLIC_MAP_ENV=development
EXPO_PUBLIC_MAP_STYLE_URL=
EXPO_PUBLIC_MAP_ATTRIBUTION=© OpenStreetMap contributors
EXPO_PUBLIC_MAP_DEBUG_ALLOW_OSM_TILES=true
```

本番:

```env
EXPO_PUBLIC_MAP_TILE_MODE=self-hosted-vector
EXPO_PUBLIC_MAP_ENV=production
EXPO_PUBLIC_MAP_STYLE_URL=https://maps.terri.example/styles/terri.json
EXPO_PUBLIC_MAP_ATTRIBUTION=© OpenStreetMap contributors
EXPO_PUBLIC_MAP_DEBUG_ALLOW_OSM_TILES=false
```

## このADRでは決めないこと

- self-hosted tileの具体的なホスティング先
- OpenMapTiles / Protomaps / PMTiles-backed endpoint の最終選定
- tile更新頻度、対象地域、cache/CDN strategy
- Web MapLibre GL JS移行の具体的な実装日
- MapScene移行期間中の既存props削除タイミング

## 備考

- 作成日: 2026-05-04
- 更新日: 2026-05-04
- 関連ADR:
  - `docs/adr/0006-zenly-style-map-engine.md`
  - `docs/adr/0009-native-maplibre-map-surface.md`
- 関連ファイル:
  - `docs/architecture.md`
  - `apps/mobile/.env.example`
  - `apps/mobile/src/components/map/MapSurface.native.tsx`
  - `apps/mobile/src/components/map/MapSurface.web.tsx`
  - `apps/mobile/src/components/map/config/*`
  - `apps/mobile/src/components/map/layers/*`
  - `apps/mobile/src/components/map/scene/*`
  - `apps/mobile/src/features/map/services/buildHomeMapScene.ts`
