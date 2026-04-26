# AGENTS.md

## 基本方針
- 回答・コメント・ドキュメントは原則日本語で書く。
- 実装判断は `docs/architecture.md` を最優先する。
- 要件確認は `docs/移動距離連動型陣取り位置情報アプリ「TERRI」 最終要件定義書.md` を参照する。
- 迷ったら「位置情報の正確性」「プライバシー」「mockとSupabaseの差し替えやすさ」「テスト容易性」を優先する。

## Skill使用
- UI/UX設計・画面レビューでは `$terri-design-principles` を使う。
- フロント実装では `$terri-frontend-architecture` を使う。
- Supabase/PostGIS/RLS/Edge Functions実装では `$terri-backend-architecture` を使う。
- すべての機能追加・変更では `$terri-test-contracts` を使う。

## フロントエンド
- `apps/mobile` はExpo React Native前提で進める。
- 画面からSupabaseを直接呼ばない。repository interfaceを通す。
- mock実装は将来のSupabase実装と同じ契約にする。
- S04メインマップを体験の中心にし、タブ型ダッシュボードに寄せない。
- 確定済み陣地とプレビュー陣地を混同しない。

## バックエンド
- 主バックエンドはSupabaseを使う。
- 永続データはPostgres/PostGISを正とする。
- 友達のライブ現在地履歴は保存しない。
- 公開テーブルはRLSを有効にする。
- user_idは認証コンテキストから導き、request bodyを信用しない。

## テスト
- 1機能実装するたび、近いレイヤーにテストを書く。
- 最低限、成功パスと失敗または境界パスを1つずつ担保する。
- privacy、auth、GPS、territory生成はnegative testを必須にする。
- mockからSupabaseへ差し替えても消さずに済むテストを書く。

## 編集ルール
- 既存の未関係な変更を戻さない。
- 仕様が長くなる場合は `AGENTS.md` を肥大化させず、詳細を `docs/` に逃す。
