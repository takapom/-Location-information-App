# 閉じた移動ループだけをテリトリー面積として扱う

## ステータス

提案済み

## コンテキスト

TERRIの体験は「移動した軌跡が陣地の縁になり、囲んだ場所が自分のテリトリーになる」ことで成立する。

直線移動をbufferで面積化すると、ユーザーが囲んでいない場所まで面積として増える。これは「ぐるっと回って囲んだ場所だけがテリトリーになる」という認識とずれる。

判断対象:

```text
tracking hook
  ↓ GPS点送信、軌跡、live preview
map scene
  ↓ route / live preview / final territoryの描画分離
Supabase RPC
  ↓ サーバー正のGPS検証と面積確定
PostGIS
  ↓ polygon生成、面積計算、GeoJSON返却
```

## 検討した選択肢

### 選択肢A: 直線軌跡をbufferで面積化する

利点:

- 実装が単純。
- どの移動でも面積が増えるため、短時間で変化を見せやすい。

欠点:

- 囲んでいない直線移動までテリトリー面積になる。
- ユーザーと確認した「囲んだ場所がテリトリー」という認識に合わない。

採用可否:

不採用。

理由:

ゲーム体験の中心が「囲む」行為ではなくなり、テリトリーとしての納得感が落ちるため。

### 選択肢B: 開始点へ戻った場合だけ面積化する

利点:

- 閉じ判定が分かりやすい。
- 複雑な過去地点探索を避けられる。

欠点:

- 移動中にできる途中ループを取りこぼす。
- 1回の移動中に複数ループを作る体験に合わない。

採用可否:

不採用。

理由:

ユーザー合意は「任意の過去地点から500m以内に戻ったら閉じた扱い」であり、開始点だけに限定しないため。

### 選択肢C: 任意の過去地点から500m以内に戻った閉じたループだけ面積化する

利点:

- 直線移動単体は面積化せず、囲んだ場所だけをテリトリー化できる。
- 1回の移動中に複数ループを扱える。
- クライアントpreviewとサーバー確定値の責務を分けられる。

欠点:

- ループ検出、GPS異常値除外、mock/Supabase契約の実装とテストが増える。
- クライアントpreviewとサーバー確定値に差分が出る可能性がある。

採用可否:

採用。

理由:

ユーザー体験、サーバーを正とする方針、位置情報の正確性、テスト容易性を最も満たすため。

## 決定

- 直線移動だけでは面積にカウントしない。
- 直線移動も、後から囲みの外周になった場合はテリトリーの縁として有効にする。
- 任意の過去地点から500m以内に戻ったら閉じたループ候補とする。
- 1回の移動中に複数ループが成立した場合は、成立したループをすべてテリトリー化する。
- 移動中は軌跡線をmapに表示し、閉じた瞬間に内側をユーザーのテリトリーcolorでlive preview表示する。
- STOPボタンで`finalize_daily_activity`を呼び、サーバー/PostGISの結果を確定値にする。
- MVPでは重なりを許容し、ユーザーごとに面積をカウントする。

MVP閾値:

- GPS精度: `accuracy_m < 50`
- 異常速度: `speed_mps <= 15`、または速度未取得
- 閉じ判定: 任意の過去地点から500m以内
- 最低有効点数: 4点
- 最低ループ距離: 100m
- 最低面積: 100m²
- PostGISでvalid polygonにできない候補は面積化しない

## 影響

- `sync_live_territory`は閉じたループだけを`territories(state='live')`へ保存する。
- ループがない場合、`daily_activities.distance_m`は更新するが`area_m2`は0になる。
- クライアントは採用済みGPS点から軽量previewを生成するが、確定値としては扱わない。
- `MapScene`は未確定軌跡線、live preview面、own final面を別レイヤーで渡す。
- mock repositoryはSupabaseと同じGPS除外契約に寄せる。

テスト観点:

- 直線移動は距離だけ増え、面積は0になる。
- 閉じたループは面積になる。
- 複数ループは複数polygonとして表示される。
- 低精度、高速、異常ジャンプGPS点はループ計算から除外される。
- STOPは確定RPCを1回だけ呼び、完了シートへ結果を渡す。

## 備考

- 作成日: 2026-05-09
- 更新日: 2026-05-09
- 関連ADR:
  - なし
- 置き換え関係:
  - なし
- 関連ファイル:
  - docs/architecture.md
  - apps/mobile/src/features/tracking/hooks/useLiveTerritory.ts
  - apps/mobile/src/features/tracking/services/loopTerritory.ts
  - apps/mobile/src/lib/repositories/mockTerriRepository.ts
  - apps/mobile/src/lib/supabase/supabaseTerriRepository.ts
  - supabase/migrations/0012_closed_loop_territory_functions.sql
- 参照資料:
  - docs/architecture.md
  - docs/ADR運用.md
  - docs/移動距離連動型陣取り位置情報アプリ「TERRI」 最終要件定義書.md
- 実装時の差分:
  - 実装後ADR `docs/adr/0011-closed-loop-territory-capture.md` に記録する。
- 未決事項:
  - 重なり控除、ランキング上の重複面積処理、自己交差ループの厳密処理。
