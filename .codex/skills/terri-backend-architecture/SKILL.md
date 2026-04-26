---
name: terri-backend-architecture
description: TERRIのSupabaseバックエンド設計ルール。Postgres、PostGIS、RLS、Realtime、Storage、Edge Functions、migration、DB schema、policy、RPC、位置情報保存、陣地生成、友達認可、ランキング、プライバシーに関わるバックエンド実装で使う。
---

# TERRI バックエンドアーキテクチャ

`supabase/` 配下とバックエンド共有契約を扱うときに使う。schemaやfunctionを実装する前に `docs/architecture.md` を読む。

## 第一原理

TERRIのバックエンドは真実を守るためにある。

- 認証の真実: 誰がユーザーか
- 位置情報の真実: どのGPS点が有効か
- 陣地の真実: 実際にどの面積を獲得したか
- 関係性の真実: 誰が何を見てよいか

Postgres/PostGISを記録の正とする。Realtime Presenceは記録の正ではない。

## Supabaseの責務

- Supabase Authは認証を担当する。
- Postgresは永続的なドメインデータを担当する。
- PostGISは地理空間データ保存、空間index、面積、距離、GeoJSON変換を担当する。
- RLSはテーブル単位のアクセス制御を担当する。
- Edge Functionsは複数stepのワークフローとサーバー側検証を担当する。
- Realtime Presence/Broadcastは短期的な友達現在地とアクティブ状態を担当する。
- Storageはアバターと生成/共有用メディアを担当する。

## データルール

- 自分のアクティビティ履歴はPostgresに保存する。
- 確定済み陣地はPostGIS geometryとして保存する。
- モバイルアプリへ返す境界でgeometryをGeoJSONへ変換する。
- 友達のライブ現在地履歴は保存しない。
- `user_id` は認証コンテキストから導く。所有者判定でrequest bodyのuser IDを信用しない。
- クエリパターンを追加したらindexも追加する。特に `(user_id, started_at)`, `(activity_id, recorded_at)`, geometry/geographyのGiST indexを優先する。

## RLSルール

公開schemaの全テーブルでRLSを有効にする。

基本policy:

- Profiles: 本人は自分のprofileを読める。承認済み友達は限定された友達項目だけ読める。
- Activities: 本人は自分のactivityだけ読み書きできる。
- Location points: 本人は自分のactivityに紐づくpointだけinsert/readできる。
- Territories: 本人は自分のterritoryを読める。承認済み友達は許可されたterritory概要だけ読める。
- Friendships: requesterまたはreceiverである関係だけ読める。

複雑な友達認可が必要な操作は、RPCまたはEdge Functionsに寄せる。

## Edge Functionルール

Edge Functionsを使う処理:

- activity完了
- GPS streamの一括検証
- territory record生成
- 友達招待の発行と承認
- 直接RLS queryでは扱いづらいranking計算

function要件:

- JWT/sessionを検証する。
- user IDはauth contextから導く。
- payloadは共有Zod schemaで検証する。
- retryされる可能性がある処理は冪等にする。
- モバイルアプリがUI状態に変換できるtyped errorを返す。

## 地理空間ルール

activity完了時の処理:

1. `recorded_at` 順に有効なGPS点を読む。
2. `accuracy_m >= 50` の点はgeometry計算から外す。
3. 不可能なジャンプや異常速度をrejectまたはflagする。
4. route LineStringを作る。
5. 30m bufferを適用する。
6. point数が20以上、かつrouteが500m以内に閉じていれば、concave hull相当の内側面積を加える。
7. 表示用geometryをsimplifyする。
8. polygon、simplified polygon、area、algorithm versionを保存する。

algorithm versionは必ず明示し、将来アルゴリズムが変わっても過去のterritoryを説明できるようにする。

## Realtimeルール

- ライブ友達現在地だけPresence/Broadcastを使う。
- `location_sharing_enabled` がfalseならpresenceを送信しない。
- プライバシー要件が変わらない限り、presenceを永続的なcurrent-location tableへ複写しない。
- 30分更新がなければclient側でoffline扱いにする。
- 友達だけが購読できるchannel設計にする。

## 完了チェック

- migrationが可逆、またはSupabase制約上forward-onlyであることが明確。
- 公開テーブルすべてでRLSが有効。
- Edge Functionがauthとschemaを検証している。
- location writeで他人になりすませない。
- territory完了処理はサーバー側を正としている。
- live friend locationを履歴として保存していない。
- 成功ケースと拒否ケースのテストがある。
