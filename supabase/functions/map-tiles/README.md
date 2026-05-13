# map-tiles Edge Function

Supabase Storage上のPMTilesと静的地図assetを、MapLibre向けのHTTPS
endpointとして配信する。

## Endpoints

- `GET /map-tiles/<tileset>.json`
- `GET /map-tiles/<tileset>/<z>/<x>/<y>.mvt`
- `GET /map-tiles/styles/<file>.json`
- `GET /map-tiles/sprites/<file>.json|png|webp`
- `GET /map-tiles/fonts/{fontstack}/{range}.pbf`
- `GET /map-tiles/glyphs/{fontstack}/{range}.pbf`

`TILESET_ALLOWLIST`
未設定または空文字ではtilesetをすべて拒否する。style/glyph/spriteも同じFunctionから配信するが、Storage
path traversalや未許可拡張子は拒否する。

## Required Env

```text
SUPABASE_URL=<project url>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
MAP_TILESET_ALLOWLIST=basemap-v2026-05-13
MAP_TILES_BUCKET=map-tiles
MAP_TILES_PUBLIC_BASE_URL=https://<project-ref>.functions.supabase.co/map-tiles
```

`SUPABASE_SERVICE_ROLE_KEY` はStorage object読み取り用。repoへ書かない。
`MAP_TILES_PUBLIC_BASE_URL` はTileJSON内の `tiles`
URLを組み立てるための外向きFunction URL。localのSupabase CLI経由では
`http://127.0.0.1:54321/functions/v1/map-tiles` を設定する。 `map-tiles` bucket
は公開地図asset専用にし、draft styleや非公開ファイルを混在させない。 Functionは
`styles/`, `sprites/`, `fonts/`, `glyphs/`
配下の許可拡張子を公開endpointとして配信する。

## Storage Layout

```text
map-tiles/
  basemap-v2026-05-13.pmtiles
  styles/
    terri.json
    terri-v2026-05-13.json
  sprites/
    terri.json
    terri.png
    terri@2x.json
    terri@2x.png
  fonts/
    Noto Sans Regular/
      0-255.pbf
```

style JSONの例:

```json
{
  "version": 8,
  "sources": {
    "basemap": {
      "type": "vector",
      "url": "https://<project-ref>.functions.supabase.co/map-tiles/basemap-v2026-05-13.json"
    }
  },
  "glyphs": "https://<project-ref>.functions.supabase.co/map-tiles/fonts/{fontstack}/{range}.pbf",
  "sprite": "https://<project-ref>.functions.supabase.co/map-tiles/sprites/terri"
}
```

## Local Checks

```bash
deno fmt --check supabase/functions/map-tiles
deno check supabase/functions/map-tiles/index.ts
deno test supabase/functions/map-tiles/__tests__/index.test.ts
```

## Deploy

```bash
supabase functions deploy map-tiles
supabase secrets set MAP_TILESET_ALLOWLIST=basemap-v2026-05-13 MAP_TILES_BUCKET=map-tiles
```

`supabase/config.toml` では `verify_jwt = false`
にする。地図asset配信は公開endpointだが、Storage読み取りはFunction内部のservice
roleで行う。
