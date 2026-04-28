# ADR 0005: 友達の確定済み陣地を承認済み友達スコープRPCで返す

## Status

Accepted

## Context

友達申請、承認済み友達一覧、友達ランキングは実装済みだが、S04地図では承認済み友達の確定済み陣地をまだ表示できなかった。現在の移動・領土化処理は自分の `daily_activities` と `territories` を更新するが、友達から見える地図表示にはつながっていなかった。

友達陣地はプライバシーと友達認可の境界になるため、mobileから `territories` や `profiles` を直接組み合わせず、DB側で `auth.uid()` と `friendships.status = 'accepted'` を強制する。

実装前方針は `docs/adr-proposals/0005-friend-territories-rpc.md` に記録した。

## Decision

- 友達陣地表示は `list_friend_territories()` RPCで返す。
- RPCは `auth.uid()` がない場合に拒否する。
- 対象は `friendships.status = 'accepted'` でつながる友達だけに限定する。
- 自分のterritoryはこのRPCに含めない。自分のlive previewや自分の確定済み陣地とは別契約にする。
- 返すterritoryは `territories.state = 'final'` のみとする。live territoryは友達向けには返さない。
- geometryはDB境界で `ST_AsGeoJSON(coalesce(simplified_polygon, polygon))::jsonb` に変換して返す。
- mobileは `TerriRepository.getFriendTerritories()` だけに依存し、Supabase RPCの形を直接知らない。
- S04では友達のfinal territoryを友達マーカー/Presenceと別データとして扱い、自分のlive previewと混同しない低opacityレイヤーで描画する。

## Consequences

- 非友達やpending関係のユーザーの陣地を返す経路を作らずにS04地図表示へつなげられる。
- 友達のライブ現在地履歴を保存しない既存方針と矛盾しない。
- MapSurfaceは描画専用propsを受けるだけで、Supabaseやrepositoryに依存しない。
- MVPの抽象地図ではGeoJSON polygonを画面上のboundsへ近似投影して描画する。将来Mapboxなどへ移行する場合も `FriendTerritory` 契約は維持できる。

## Impact

- Shared contract:
  - `GeoJsonPolygon`
  - `GeoJsonMultiPolygon`
  - `TerritoryGeometry`
  - `FriendTerritory`

- Mobile:
  - `TerriRepository.getFriendTerritories()` を追加した。
  - `mockTerriRepository` と `supabaseTerriRepository` に同じ契約を実装した。
  - `HomeMapScreen` の初期ロードで友達陣地を取得する。
  - `MapSurface` は `friendTerritories` propsを受け、友達final territory専用レイヤーで描画する。

- Supabase:
  - `supabase/migrations/0009_friend_territories.sql` を追加した。
  - `list_friend_territories()` は `auth.uid()`、accepted friendship、final territoryをDB側で強制する。

- Test:
  - SQL contract testに認証、accepted friend限定、final限定、GeoJSON変換、grantの検証を追加した。
  - Supabase repository mapper testに友達陣地行変換を追加した。
  - mock repository contract testに友達陣地取得を追加した。
  - MapSurface/mapGeometry testに友達陣地描画とGeoJSON投影を追加した。

## Notes

- 作成日: 2026-04-29
- 関連ADR:
  - `docs/adr/0003-friend-request-response.md`
  - `docs/adr/0004-friend-ranking-rpc.md`
- 関連ファイル:
  - `docs/architecture.md`
  - `packages/shared/src/index.ts`
  - `apps/mobile/src/lib/repositories/terriRepository.ts`
  - `apps/mobile/src/lib/repositories/mockTerriRepository.ts`
  - `apps/mobile/src/lib/supabase/supabaseTerriRepository.ts`
  - `apps/mobile/src/features/map/components/HomeMapScreen.tsx`
  - `apps/mobile/src/components/map/MapSurface.tsx`
  - `apps/mobile/src/components/map/mapGeometry.ts`
  - `supabase/migrations/0009_friend_territories.sql`
