# ADR 0009: Native MapSurfaceをMapLibre React Nativeへ接続する

## Status

Accepted

## Context

S04メインマップはWebでLeaflet/OSMへ接続済みだが、Nativeは抽象マップfallbackのままだった。TERRIの中心体験は現在地、友達、確定済み陣地、live previewを同じ地図上で扱うことなので、Nativeでも実地図SDKへ進める必要があった。

既存方針では、画面・hook・repositoryは `MapSurface` propsだけに依存し、地図エンジン固有コードを `apps/mobile/src/components/map` 配下へ閉じ込める。

実装前方針は `docs/adr-proposals/0009-native-maplibre-map-surface.md` に記録した。

## Decision

- Nativeの地図SDKは `@maplibre/maplibre-react-native` を採用する。
- Mapbox tokenをMVPの必須条件にしないため、dev buildではアプリ内定義のOSM raster tile styleを使う。
- `MapSurface.native.tsx` を追加し、Expo Router screenやfeature hookからMapLibreを直接importしない。
- `MapSurface` props契約は維持し、`center`、`currentLocation`、`friends`、`friendTerritories`、`live`、`showRoute` をNative地図レイヤーへ変換する。
- 友達の確定済み陣地、live preview、tracking route、友達marker、自分markerは別レイヤーとして扱う。
- MapLibre用GeoJSON変換は `mapNativeLayers.ts` のpure helperに分離し、SDKを起動しないunit testで検証する。

## Consequences

- Native実機ではdev build/prebuildが必要になる。Expo GoだけではMapLibre native moduleは使えない。
- S04 screenは引き続き地図SDKを知らないため、Web LeafletとNative MapLibreを同じprops境界で維持できる。
- 本番地図style/tilesは別途MapTiler、Stadia Maps、自前tileなどを選ぶ必要がある。
- iOS/Android実機でのGPS、権限、地図レンダリング検証は残る。

## Impact

- Mobile:
  - `@maplibre/maplibre-react-native` を追加した。
  - `app.json` にMapLibre config pluginを追加した。
  - `MapSurface.native.tsx` を追加した。
  - `mapNativeLayers.ts` でMapLibre向けGeoJSON変換を追加した。

- Test:
  - `mapNativeLayers.test.ts` で座標順、友達確定済み陣地、live preview、routeの変換契約を検証した。

## Notes

- 作成日: 2026-04-30
- 関連ADR:
  - `docs/adr/0006-zenly-style-map-engine.md`
  - `docs/adr/0007-friend-live-presence.md`
- 関連ファイル:
  - `docs/architecture.md`
  - `apps/mobile/app.json`
  - `apps/mobile/src/components/map/MapSurface.native.tsx`
  - `apps/mobile/src/components/map/mapNativeLayers.ts`
  - `apps/mobile/package.json`
