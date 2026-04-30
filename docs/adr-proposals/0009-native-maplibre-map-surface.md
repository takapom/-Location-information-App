# ADR Proposal 0009: Native MapSurfaceをMapLibre React Nativeへ接続する

## Status

Proposed

## Context

S04メインマップはWebでLeaflet/OSMへ接続済みだが、Nativeは抽象マップfallbackのままだった。TERRIの中心体験は現在地、友達、確定済み陣地、live previewを同じ地図上で扱うことなので、Nativeでも実地図SDKへ進める必要がある。

既存方針では、画面・hook・repositoryは `MapSurface` propsだけに依存し、地図エンジン固有コードを `apps/mobile/src/components/map` 配下へ閉じ込める。

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
