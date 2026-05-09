# 閉じた移動ループだけをテリトリー面積として扱う

## ステータス

承認

## コンテキスト

TERRIのテリトリー体験は、ユーザーの認識として「移動した軌跡が縁になり、囲んだ場所が自分の色になる」ことを前提にする。

従来の直線軌跡bufferを面積化する方式では、囲んでいない直線移動でも面積が増える。これはユーザーが期待する「ぐるっと回って囲んだ場所がテリトリーになる」という体験とずれる。

判断対象:

```text
Mobile tracking
  ↓ 採用済みGPS点から軌跡線とlive previewを生成
MapScene
  ↓ 未確定軌跡線 / live preview面 / own final面を分離して描画
Supabase RPC
  ↓ GPS点検証、閉じたループ検出、live/final territory保存
PostGIS
  ↓ 面積計算、valid polygon判定、GeoJSON返却
```

確定済み面積はランキングや履歴に影響するため、サーバー/PostGISを正にする必要がある。一方で、閉じた瞬間の体験は遅延させたくないため、クライアントにも同じ閾値の軽量previewを持たせる。

## 検討した選択肢

### 選択肢A: 直線軌跡にbufferをかけて面積化する

利点:

- 実装が単純で、短い移動でも面積が増える
- 従来のPostGIS buffer処理を流用しやすい

欠点:

- 直線移動でもテリトリー面積が増え、ユーザー認識とずれる
- 「囲む」ゲーム性が弱くなる

採用可否:

不採用。

理由:

ユーザー合意済みの体験は、直線移動単体では面積にならず、囲んだ移動だけがテリトリー面になることだから。

### 選択肢B: 開始点に戻った場合だけ面積化する

利点:

- ルールが説明しやすい
- 実装が比較的単純

欠点:

- 長い移動中に途中地点へ戻ってできる自然なループを取りこぼす
- 1回の移動中に複数ループを作る体験に合わない

採用可否:

不採用。

理由:

「任意の過去地点から500m以内に戻ったら閉じた扱い」とするユーザー合意に合わない。

### 選択肢C: 任意の過去地点から500m以内に戻った閉じたループだけ面積化する

利点:

- 直線移動を面積化せず、囲んだ移動だけをテリトリー化できる
- 1回の移動中に複数ループを検出できる
- クライアントpreviewとサーバー確定値の責務を分離できる

欠点:

- GPS点の検証、ループ検出、重複候補除外の実装が増える
- previewとサーバー確定結果に差分が出る可能性がある

採用可否:

採用。

理由:

ユーザー体験、位置情報の正確性、サーバーを正とする方針、mockとSupabaseの差し替えやすさを同時に満たせる。

## 決定

任意の過去地点から500m以内に戻った閉じた移動ループだけをテリトリー面積として扱う。

直線移動は軌跡としてmapに表示するが、単独では面積にカウントしない。直線移動でも、後続の移動によって囲みの外周になった場合は、その区間をテリトリーの縁として使う。

1回の移動中に複数ループが成立した場合は、MVPでは成立したループをすべてテリトリー化する。前のループ終端と次のループ始点が同じ共有端点になる連続ループは許可する。

移動中はクライアントが採用済みGPS点から軽量なlive preview MultiPolygonを生成し、閉じた瞬間にユーザーのテリトリーcolorで塗る。STOPボタンで`finalize_daily_activity`を呼び、サーバー/PostGISの結果を確定値にする。

MVP閾値:

- `accuracy_m < 50`
- `speed_mps <= 15`、または速度未取得
- 閉じ判定は任意の過去地点から500m以内
- 有効点4点以上
- ループ距離100m以上
- 面積100m²以上
- PostGISでvalid polygonにできる候補だけ採用

実装範囲:

```text
apps/mobile/src/features/tracking/services/loopTerritory.ts
  ↓ クライアント用の閉じたループpreview

apps/mobile/src/features/tracking/hooks/useLiveTerritory.ts
  ↓ 軌跡、preview、STOP確定、同期中/確定中状態の制御

apps/mobile/src/features/map/components/HomeMapScreen.tsx
  ↓ live previewとfinal polygonを混同せずMapSceneへ渡す

apps/mobile/src/lib/repositories/mockTerriRepository.ts
  ↓ Supabaseと同じGPS除外条件でmock結果を返す

supabase/migrations/0012_closed_loop_territory_functions.sql
  ↓ sync_live_territory / finalize_daily_activityで閉じたループだけ保存

docs/architecture.md
  ↓ 6.1 / 6.2 / 6.3 のトラッキング・確定アルゴリズムを更新
```

## 影響

- Mobile:
  - 未確定軌跡線、live preview面、own final面を別データとして扱う。
  - STOP後の完了表示はサーバーが返したfinal polygonだけを使い、live previewを確定済みとして見せない。
  - 確定中または確定済みの古いsync結果はstateへ反映しない。

- Repository:
  - mock repositoryは`accuracy_m`、`speed_mps`、異常ジャンプ、`recorded_at`順序の扱いをSupabase側へ寄せる。
  - `polygonGeojson`が`null`の場合は、アプリ境界で`undefined`へ正規化する。

- Database/RPC:
  - `sync_live_territory`は閉じたループがない場合、距離だけ更新し、live territory rowを削除する。
  - `finalize_daily_activity`はSTOP時にfinal territory idを返し、retry時も同じfinal stateを返す。
  - RLS/authは`auth.uid()`を正とし、他人のactivityを確定できない。

- Privacy:
  - 友達のライブ現在地履歴は保存しない方針を変えない。
  - `accuracy_m >= 50`の低精度点は通常のクライアント送信前に落とし、Repository/Supabase境界で受けた場合も`accepted_for_geometry=false`または同期時フィルタで距離・面積計算から除外する。

- Test:
  - 直線移動は面積0、閉じたループは面積化、複数ループと共有端点ループをunit testで確認する。
  - mock repositoryが高速点、異常ジャンプ、時系列順序をSupabase契約と同じように扱うことを確認する。
  - Supabase SQL contract testでauth、owner条件、`polygonGeojson`、共有端点、final territory idの返却を確認する。

## 備考

- 作成日: 2026-05-09
- 更新日: 2026-05-09
- 関連ADR:
  - ADR 0010: MapSurface facadeと地図レイヤー境界を分離する
- 置き換え関係:
  - なし
- 関連ファイル:
  - docs/architecture.md
  - docs/adr-proposals/0011-closed-loop-territory-capture.md
  - apps/mobile/src/features/tracking/services/loopTerritory.ts
  - apps/mobile/src/features/tracking/hooks/useLiveTerritory.ts
  - apps/mobile/src/features/tracking/services/liveTerritoryState.ts
  - apps/mobile/src/features/map/components/HomeMapScreen.tsx
  - apps/mobile/src/features/map/components/LiveTerritoryPanel.tsx
  - apps/mobile/src/lib/repositories/mockTerriRepository.ts
  - apps/mobile/src/lib/supabase/supabaseTerriRepository.ts
  - supabase/migrations/0012_closed_loop_territory_functions.sql
  - packages/shared/src/index.ts
- 参照資料:
  - docs/architecture.md
  - docs/ADR運用.md
  - docs/移動距離連動型陣取り位置情報アプリ「TERRI」 最終要件定義書.md
- 実装時の差分:
  - Edge FunctionではなくSupabase RPC/PostGIS migrationでMVPの確定処理を実装した。
  - ループがない場合もGPS点は保存し、距離だけ更新する。
- 未決事項:
  - 重なり控除、ランキング上の重複面積処理、より厳密な自己交差ループ処理はMVP後に別ADRで判断する。
