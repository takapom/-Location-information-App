# ADR Proposal 0006: Zenly風マップは実地図エンジンを維持して表現層で実装する

## Status

Proposed

## Context

S04メインマップをZenly風に寄せる試行で、地図を自由にdrag/zoomできない、現在地中心の実地図が表示されているか分かりづらい、という回帰が起きた。TERRIの地図は「現在地」「友達現在地」「確定済み陣地」「live preview」を同じ体験内で扱う中核UIであり、見た目の変更で地図操作や現在地表示を壊してはいけない。

一方で、Expo Goでの確認速度も重要である。今すぐnative地図SDKへ切り替えるとdev buildやAPI key設定の影響が大きい。MVPでは既存のWeb Leaflet/OSM実装を安定化し、Nativeは抽象マップを維持しながら、MapSurface境界を地図エンジン差し替え可能な形に保つ。

## Decision

- S04の地図描画は `MapSurface` facadeに閉じ込める。
- 画面、hook、repositoryは `MapSurface` に描画用propsだけを渡し、Supabase client、repository、GPS取得を `MapSurface` へ持ち込まない。
- WebはLeaflet/OSMの実地図エンジンを維持する。
- Zenly風の見た目はタイル色調整、アバターマーカー、友達限定チップ、ポリゴンスタイルなどのレイヤー/オーバーレイで表現する。
- 地図上のUIオーバーレイはmap gestureを奪わない。
- ユーザーがdrag/zoomした後は、位置情報更新や同値props再描画で自動的に現在地へ戻さない。
- 自動追従はユーザー操作前、または将来追加する明示的な現在地復帰操作に限定する。
- 友達final territory、友達marker、自分のlive preview、自分の現在地markerは別レイヤーとして扱う。
- Nativeは当面Expo Goで動く抽象マップを維持し、Mapbox/MapLibreへ移行するときも `MapSurface` props契約を維持する。

## Consequences

- Zenly風の視覚表現を進めても、実地図のpan/zoomと現在地表示を維持できる。
- 新しいnative地図SDK導入を急がず、Expo Goで確認できる状態を保てる。
- 地図エンジン固有コードは `MapSurface` 配下に閉じるため、後からMapbox/MapLibreへ移行しやすい。
- WebとNativeで見た目の完全一致はまだ保証しない。MVPでは操作性、現在地正確性、レイヤー契約を優先する。
