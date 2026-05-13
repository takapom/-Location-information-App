import {
  buildTileJson,
  handleRequest,
  isSafeObjectPath,
  isTilesetAllowed,
  parseRoute,
  parseTilesetAllowlist,
  validateTileCoord,
} from "../index.ts";

Deno.test("parseTilesetAllowlist keeps only safe tileset ids", () => {
  const allowlist = parseTilesetAllowlist("basemap, japan-2026, ../secret, ");

  assert(isTilesetAllowed("basemap", allowlist));
  assert(isTilesetAllowed("japan-2026", allowlist));
  assert(!isTilesetAllowed("../secret", allowlist));
});

Deno.test("parseRoute accepts TileJSON and z/x/y vector tile paths", () => {
  assertEquals(parseRoute("/map-tiles/basemap.json"), {
    kind: "tilejson",
    tileset: "basemap",
  });

  assertEquals(parseRoute("/functions/v1/map-tiles/basemap/3/4/5.mvt"), {
    kind: "tile",
    tileset: "basemap",
    z: 3,
    x: 4,
    y: 5,
  });
});

Deno.test("parseRoute rejects invalid tile coordinates", () => {
  assertEquals(parseRoute("/map-tiles/basemap/2/4/0.mvt"), {
    kind: "bad_request",
    error: "invalid_tile_coord",
  });
});

Deno.test("static object path validation rejects traversal but accepts sprite and font names", () => {
  assert(isSafeObjectPath("sprites/sprite@2x.json"));
  assert(isSafeObjectPath("fonts/Noto Sans Regular/0-255.pbf"));
  assert(!isSafeObjectPath("styles/../secret.json"));
});

Deno.test("parseRoute rejects unsafe or unsupported static asset extensions", () => {
  assertEquals(parseRoute("/map-tiles/sprites/sprite.svg"), {
    kind: "not_found",
  });
  assertEquals(parseRoute("/map-tiles/sprites/sprite.png.exe"), {
    kind: "not_found",
  });
  assertEquals(parseRoute("/map-tiles/fonts/Noto/0-255.json"), {
    kind: "not_found",
  });
});

Deno.test("validateTileCoord enforces z/x/y bounds", () => {
  assert(validateTileCoord(0, 0, 0));
  assert(validateTileCoord(4, 15, 15));
  assert(!validateTileCoord(4, 16, 0));
  assert(!validateTileCoord(25, 0, 0));
});

Deno.test("buildTileJson uses forwarded origin when behind Edge Runtime", () => {
  const tileJson = buildTileJson(
    new URL("http://supabase_edge_runtime_terri:8081/map-tiles/basemap.json"),
    "basemap",
    { minZoom: 0, maxZoom: 0 },
    {},
    new Headers({
      "x-forwarded-host": "127.0.0.1:54321",
      "x-forwarded-proto": "http",
    }),
  );

  assertEquals(tileJson.tiles, [
    "http://127.0.0.1:54321/map-tiles/basemap/{z}/{x}/{y}.mvt",
  ]);
});

Deno.test("buildTileJson prefers configured public base URL", () => {
  const tileJson = buildTileJson(
    new URL("http://supabase_edge_runtime_terri:8081/map-tiles/basemap.json"),
    "basemap",
    { minZoom: 0, maxZoom: 0 },
    {},
    new Headers(),
    "http://127.0.0.1:54321/functions/v1/map-tiles",
  );

  assertEquals(tileJson.tiles, [
    "http://127.0.0.1:54321/functions/v1/map-tiles/basemap/{z}/{x}/{y}.mvt",
  ]);
});

Deno.test("handleRequest returns CORS preflight response for OPTIONS", async () => {
  const response = await handleRequest(
    new Request("https://example.test/map-tiles/basemap.json", {
      method: "OPTIONS",
    }),
  );

  assertEquals(response.status, 204);
  assertEquals(
    response.headers.get("access-control-allow-methods"),
    "GET, OPTIONS",
  );
});

Deno.test("handleRequest rejects non-GET methods with 405", async () => {
  const response = await handleRequest(
    new Request("https://example.test/map-tiles/basemap.json", {
      method: "POST",
    }),
  );

  assertEquals(response.status, 405);
  assertEquals(response.headers.get("allow"), "GET, OPTIONS");
  assertEquals(await response.json(), { error: "method_not_allowed" });
});

Deno.test({
  name: "handleRequest rejects requests when tileset allowlist is empty",
  async fn() {
    await withEnv(
      {
        MAP_TILESET_ALLOWLIST: undefined,
        MAP_TILES_BUCKET: undefined,
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        SUPABASE_URL: "https://project-ref.supabase.co",
      },
      async () => {
        const response = await handleRequest(
          new Request("https://example.test/map-tiles/basemap.json"),
        );

        assertEquals(response.status, 403);
        assertEquals(await response.json(), {
          error: "tileset_allowlist_required",
        });
      },
    );
  },
});

Deno.test({
  name: "handleRequest serves static assets with the declared content type",
  async fn() {
    await withEnv(
      {
        MAP_TILESET_ALLOWLIST: "basemap",
        MAP_TILES_BUCKET: "map-tiles",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        SUPABASE_URL: "https://project-ref.supabase.co",
      },
      async () => {
        await withFetch(async (input, init) => {
          assertEquals(
            String(input),
            "https://project-ref.supabase.co/storage/v1/object/map-tiles/styles/style.json",
          );
          const headers = new Headers(
            (init as { headers?: HeadersInit } | undefined)?.headers,
          );
          assertEquals(headers.get("authorization"), "Bearer service-role-key");
          assertEquals(headers.get("apikey"), "service-role-key");

          return new Response('{"version":8}', {
            status: 200,
            headers: {
              "cache-control": "public, max-age=60",
              etag: '"style-etag"',
            },
          });
        }, async () => {
          const response = await handleRequest(
            new Request("https://example.test/map-tiles/styles/style.json"),
          );

          assertEquals(response.status, 200);
          assertEquals(
            response.headers.get("content-type"),
            "application/json; charset=utf-8",
          );
          assertEquals(
            response.headers.get("cache-control"),
            "public, max-age=60",
          );
          assertEquals(response.headers.get("etag"), '"style-etag"');
          assertEquals(await response.text(), '{"version":8}');
        });
      },
    );
  },
});

Deno.test({
  name: "handleRequest maps PMTiles Storage 404 to tileset 404",
  async fn() {
    await withStaticStorageResponse(
      new Response("missing", { status: 404 }),
      async () => {
        const response = await handleRequest(
          new Request("https://example.test/map-tiles/basemap.json"),
        );

        assertEquals(response.status, 404);
        assertEquals(await response.json(), { error: "tileset_not_found" });
      },
    );
  },
});

Deno.test({
  name: "handleRequest maps PMTiles Storage auth failures to upstream errors",
  async fn() {
    await withStaticStorageResponse(
      new Response("forbidden", { status: 403 }),
      async () => {
        const response = await handleRequest(
          new Request("https://example.test/map-tiles/basemap.json"),
        );

        assertEquals(response.status, 502);
        assertEquals(await response.json(), { error: "storage_auth_failed" });
      },
    );
  },
});

Deno.test({
  name: "handleRequest maps PMTiles Storage bad requests to upstream errors",
  async fn() {
    await withStaticStorageResponse(
      new Response("bad request", { status: 400 }),
      async () => {
        const response = await handleRequest(
          new Request("https://example.test/map-tiles/basemap.json"),
        );

        assertEquals(response.status, 502);
        assertEquals(await response.json(), {
          error: "storage_upstream_error",
        });
      },
    );
  },
});

Deno.test({
  name: "handleRequest maps Storage 404 to static asset 404",
  async fn() {
    await withStaticStorageResponse(
      new Response("missing", { status: 404 }),
      async () => {
        const response = await handleRequest(
          new Request("https://example.test/map-tiles/sprites/terri.png"),
        );

        assertEquals(response.status, 404);
        assertEquals(await response.json(), { error: "not_found" });
      },
    );
  },
});

Deno.test({
  name: "handleRequest maps Storage failures to static asset upstream errors",
  async fn() {
    await withStaticStorageResponse(
      new Response("upstream error", { status: 500 }),
      async () => {
        const response = await handleRequest(
          new Request(
            "https://example.test/map-tiles/fonts/Noto Sans/0-255.pbf",
          ),
        );

        assertEquals(response.status, 502);
        assertEquals(await response.json(), {
          error: "storage_upstream_error",
        });
      },
    );
  },
});

Deno.test({
  name:
    "handleRequest maps Storage auth failures to static asset upstream errors",
  async fn() {
    await withStaticStorageResponse(
      new Response("forbidden", { status: 403 }),
      async () => {
        const response = await handleRequest(
          new Request("https://example.test/map-tiles/styles/terri.json"),
        );

        assertEquals(response.status, 502);
        assertEquals(await response.json(), { error: "storage_auth_failed" });
      },
    );
  },
});

function assert(condition: boolean, message = "assertion failed"): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals(actual: unknown, expected: unknown): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    throw new Error(`expected ${expectedJson}, got ${actualJson}`);
  }
}

async function withStaticStorageResponse(
  storageResponse: Response,
  run: () => Promise<void>,
): Promise<void> {
  await withEnv(
    {
      MAP_TILESET_ALLOWLIST: "basemap",
      MAP_TILES_BUCKET: "map-tiles",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      SUPABASE_URL: "https://project-ref.supabase.co",
    },
    async () => {
      await withFetch(async () => storageResponse, run);
    },
  );
}

async function withEnv(
  values: Record<string, string | undefined>,
  run: () => Promise<void>,
): Promise<void> {
  const originalGet = Deno.env.get;

  try {
    Deno.env.get = ((key: string) => values[key]) as typeof Deno.env.get;
    await run();
  } finally {
    Deno.env.get = originalGet;
  }
}

async function withFetch(
  fetchStub: (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ) => Promise<Response>,
  run: () => Promise<void>,
): Promise<void> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchStub;

  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}
