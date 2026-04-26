---
name: terri-frontend-architecture
description: TERRIのExpo React Nativeフロントエンド設計ルール。モバイル画面、feature分割、Supabase client境界、mock repository、トラッキング、Mapboxレイヤー、状態管理、テスト配置、バックエンド差し替え可能な実装をdocs/architecture.mdに沿って進めるときに使う。
---

# TERRI フロントエンドアーキテクチャ

`apps/mobile` の実装で使う。構造判断をする前に `docs/architecture.md` を読む。

## 第一原理

フロントエンドの責務は2つ。

- ライブで反応のよい地図ゲーム体験を提供する
- mockをSupabaseへ差し替えても画面を書き直さなくてよい境界を作る

UIコンポーネントは、データがmock、Supabase、将来のAPIのどれから来ているかを知らない状態にする。

## モジュール境界

featureコードは `apps/mobile/src/features/<feature>` に置く。

推奨構成:

```text
features/tracking/
  components/
  hooks/
  services/
  repositories/
  __tests__/
  types.ts
```

責務分担:

- `components`: 表示専用UIと小さな合成ビュー
- `hooks`: 画面に近い状態遷移とワークフロー制御
- `services`: トラッキング開始/停止などの業務フロー
- `repositories`: バックエンド境界のinterfaceと実装
- `types.ts`: feature内だけで使う型

共通UIは `src/components` に置く。バックエンドと共有するAPI契約はfeature配下ではなく `packages/shared` に置く。

## 差し替え可能なデータアクセス

mock実装を書く前にrepository interfaceを定義する。

例:

```ts
export interface ActivityRepository {
  startActivity(input: StartActivityInput): Promise<Activity>;
  appendLocationPoint(activityId: string, point: LocationPointInput): Promise<void>;
  completeActivity(activityId: string): Promise<CompletedActivity>;
}
```

その上で次を用意する。

- ローカル開発用の `mockActivityRepository`
- バックエンド実装用の `supabaseActivityRepository`
- 特定実装だけでなく、interfaceの振る舞いに対するテスト

画面や表示コンポーネントから `supabase.from(...)` を直接呼ばない。

## 状態管理

- 一時的なUI状態はReact stateで持つ。
- featureのワークフローはcustom hookに閉じ込める。
- query/cache系の仕組みは、実際に非同期サーバー境界がある場合に使う。
- トラッキング状態は `idle`, `requestingPermission`, `tracking`, `stopping`, `completed`, `error` のように明示する。
- 権限拒否とバックグラウンドトラッキング不可は、一般的なエラーとは分ける。

## 地図とトラッキング

- Mapboxレイヤー生成はfeature utilityまたはcomponentの内側に閉じ込める。
- 確定済み陣地とプレビュー陣地は別データとして扱う。
- クライアント側のポリゴンプレビューは近似値として扱う。確定面積として表示しない。
- GPS取得、送信間隔制御、権限処理はtrackingのservice/hookに置く。
- Presence送信はトラッキングのワークフロー責務であり、地図描画の責務ではない。

## 画面ルール

- Expo Routerのファイルは薄く保つ。feature screenとproviderを組み合わせるだけにする。
- S04メインマップを基本体験にする。要件がモーダル/詳細と示していない限り、何でもフルページ遷移にしない。
- ボトムシートはデータとcallbackを受け取る。ボトムシート内で直接fetchしない。
- 読み込み中、空状態、権限拒否、オフライン状態はfeatureの一部として実装する。

## テスト義務

実装したfeatureには、必ず近いレイヤーにテストを書く。

- componentの振る舞い: component横またはfeatureの `__tests__`
- hookのワークフロー: hook近くのテスト
- service/repositoryロジック: service/repository横のunit test
- 地図・幾何adapter: pure utility test

テストがないfeatureは完了扱いにしない。

## 実装チェック

- 画面が生のSupabase呼び出しをimportしていない。
- providerの差し替えだけでmockからSupabaseへ変更できる。
- feature状態に読み込み、エラー、権限状態が含まれている。
- UIコンポーネントは可能な範囲でprops制御になっている。
- 成功パスと失敗/境界パスのテストがある。
- バックエンドと共有する型は `packages/shared` にある。
