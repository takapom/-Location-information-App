---
name: terri-test-contracts
description: TERRIのテスト義務とリスクベースのテスト設計。feature、UI画面、hook、repository、Supabase migration、RLS policy、Edge Function、地理空間アルゴリズム、トラッキング、友達presence、ランキング、プライバシー関連コードを追加・変更するときに、近いレイヤーへ書くべきテストを決めるために使う。
---

# TERRI テスト契約

実装を完了扱いにする前に使う。ユーザー要件として、すべてのfeatureには近いレイヤーにテストを書く。

## 第一原理

テストはプロダクトの約束を守るために書く。

- 移動が正しい陣地になる
- ユーザーは見てはいけないデータを見たり変更したりできない
- ライブ位置情報が意図しない履歴にならない
- frontend mockとbackend実装が同じ契約に従う
- UI状態がライブな地図体験を壊さない

ドメインリスクがある振る舞いをsnapshotやsmoke testだけで済ませない。

## テスト配置

振る舞いに最も近い場所へ置く。

- Component UI: component横またはfeatureの `__tests__/`
- Hook state machine: hookの近く
- Service workflow: serviceの近く
- Repository contract: repository interfaceの近く
- 共有schema/type: `packages/shared`
- Geo algorithm: `packages/geo`
- Supabase SQL/RLS: `supabase/tests` またはmigration近くのSQL test
- Edge Function: function横または `supabase/functions/<name>/__tests__`

自然な置き場所がない場合、設計が絡まりすぎている可能性が高い。

## feature別の必須テスト

### フロントエンド画面

次を担保する。

- 初期表示
- 読み込み状態
- 空状態がある場合は空状態
- エラー状態
- 主要action
- 権限拒否、オフライン、友達なしなどの境界状態を1つ以上

### トラッキング

次を担保する。

- 権限許可パス
- 権限拒否パス
- GPS点送信ルール: 5秒または10m移動
- 低速/停止時に低頻度へ寄せる挙動
- STOPが完了処理を1回だけ呼ぶこと
- preview territoryとconfirmed territoryを混同しないこと

### Repository抽象

次を担保する。

- mock repositoryが将来のSupabase repositoryと同じinterfaceを満たす
- errorがアプリ内error型へ正規化される
- screenが生のbackend clientをimportしない

### 地理空間ロジック

次を担保する。

- 距離計算
- `accuracy >= 50m` の除外
- 異常速度/ジャンプのfilter
- buffer半径の前提
- 500m以内で閉じたroute判定
- 面積出力が明示した許容誤差内で安定すること
- simplify後に空または不正geometryにならないこと

### Supabase/RLS

次を担保する。

- userが自分のrowを読める/書ける
- userが他人のprivate rowを読めない/書けない
- 承認済み友達が許可された友達データだけ読める
- 非友達はfriend-only dataを読めない
- location sharing offでlive presenceが露出しない

### Edge Functions

次を担保する。

- 未認証requestを拒否する
- 認証済みownerの成功
- 他人のactivityをcompleteできない
- 不正payloadを拒否する
- 必要な処理はretryしても冪等
- 失敗後にDB writeが不整合にならない

### Realtime Presence

次を担保する。

- presence payloadのshape
- sharing disabledではlive locationを送らない
- START/STOPでactive stateが切り替わる
- 古いupdateは閾値後にoffline扱いになる

## 最低完了ライン

すべてのfeature実装に最低限含める。

- 成功パスのテストを1つ
- 失敗または境界パスのテストを1つ
- 重要な業務ルールが存在するレイヤーのテストを1つ

privacy、auth、GPS、territory generationでは、happy pathがあっても拒否/不正ケースを必ず含める。

## Mock品質ルール

- mockは想定するSupabase契約と同じように振る舞う。非同期性とerrorも含める。
- mockをbackendより permissive にしない。
- mock dataには少なくとも1つの境界ケースを入れる。友達なし、古いpresence、低精度GPS、権限拒否など。
- mockからSupabaseへ差し替えるためにscreen codeを変える必要があるなら、抽象化に失敗している。

## レビューチェック

- 新しい振る舞いに近い場所のテストがあるか。
- 実装の細部ではなく振る舞いをassertしているか。
- privacyまたはauthorization ruleにnegative testがあるか。
- 地理空間計算は完全一致ではなく許容誤差で検証しているか。
- mockをSupabaseに置き換えてもテストを消さずに済むか。
