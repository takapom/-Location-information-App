import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { PMTiles } from "https://esm.sh/pmtiles@3.2.1?target=deno";

const DEFAULT_BUCKET = "map-tiles";
const FUNCTION_NAME = "map-tiles";
const TILE_CACHE_CONTROL =
  "public, max-age=86400, stale-while-revalidate=604800";
const STATIC_CACHE_CONTROL =
  "public, max-age=3600, stale-while-revalidate=86400";
const JSON_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600";

type Route =
  | { kind: "tilejson"; tileset: string }
  | { kind: "tile"; tileset: string; z: number; x: number; y: number }
  | { kind: "static"; objectPath: string; contentType: string }
  | { kind: "not_found" }
  | { kind: "bad_request"; error: string };

type RangeResponse = {
  data: ArrayBuffer;
  etag?: string;
  cacheControl?: string;
  expires?: string;
};

type EnvConfig = {
  bucket: string;
  allowlist: Set<string>;
  publicBaseUrl?: string;
  supabaseUrl: string;
  serviceRoleKey: string;
};

type TileUpstreamErrorCode =
  | "tileset_not_found"
  | "tile_not_found"
  | "storage_auth_failed"
  | "storage_range_invalid"
  | "storage_upstream_error"
  | "tile_processing_failed";

type TileUpstreamErrorResponse = {
  error: TileUpstreamErrorCode;
  status: number;
};

type StaticStorageErrorCode =
  | "not_found"
  | "storage_auth_failed"
  | "storage_upstream_error";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, range",
  "Access-Control-Max-Age": "86400",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json; charset=utf-8",
};

export function parseTilesetAllowlist(raw: string | undefined): Set<string> {
  if (!raw) {
    return new Set();
  }

  return new Set(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter((value) => isSafePathSegment(value)),
  );
}

export function isTilesetAllowed(
  tileset: string,
  allowlist: Set<string>,
): boolean {
  return allowlist.has(tileset);
}

export function isSafePathSegment(segment: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(segment) &&
    segment !== "." && segment !== "..";
}

export function isSafeStaticPathSegment(segment: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._@, ()+-]{0,191}$/.test(segment) &&
    segment !== "." && segment !== ".." && !segment.includes("\\");
}

export function isSafeObjectPath(path: string): boolean {
  const segments = path.split("/");
  return (
    segments.length > 1 &&
    segments.every((segment) => isSafeStaticPathSegment(segment)) &&
    !path.includes("//") &&
    !path.includes("\\")
  );
}

export function validateTileCoord(z: number, x: number, y: number): boolean {
  if (!Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y)) {
    return false;
  }

  if (z < 0 || z > 24) {
    return false;
  }

  const max = 2 ** z;
  return x >= 0 && x < max && y >= 0 && y < max;
}

export function parseRoute(pathname: string): Route {
  const segments = splitPath(pathname);
  if (!segments) {
    return { kind: "bad_request", error: "invalid_path_encoding" };
  }

  const functionIndex = segments.indexOf(FUNCTION_NAME);
  const routeSegments = functionIndex >= 0
    ? segments.slice(functionIndex + 1)
    : segments;

  if (routeSegments.length === 1) {
    const match = /^(.+)\.json$/.exec(routeSegments[0]);
    if (match && isSafePathSegment(match[1])) {
      return { kind: "tilejson", tileset: match[1] };
    }
  }

  if (routeSegments.length === 4 && isSafePathSegment(routeSegments[0])) {
    const [tileset, zRaw, xRaw, yRaw] = routeSegments;
    const match = /^(\d+)\.mvt$/.exec(yRaw);
    if (/^\d+$/.test(zRaw) && /^\d+$/.test(xRaw) && match) {
      const z = Number(zRaw);
      const x = Number(xRaw);
      const y = Number(match[1]);
      return validateTileCoord(z, x, y)
        ? { kind: "tile", tileset, z, x, y }
        : { kind: "bad_request", error: "invalid_tile_coord" };
    }
  }

  const staticRoute = parseStaticRoute(routeSegments);
  if (staticRoute) {
    return staticRoute;
  }

  return { kind: "not_found" };
}

export function buildTileJson(
  requestUrl: URL,
  tileset: string,
  header: Record<string, unknown>,
  metadata: Record<string, unknown>,
  requestHeaders = new Headers(),
  publicBaseUrl?: string,
): Record<string, unknown> {
  const basePath = stripTileJsonSuffix(requestUrl.pathname);
  const tileUrl = publicBaseUrl
    ? `${publicBaseUrl.replace(/\/$/, "")}/${tileset}/{z}/{x}/{y}.mvt`
    : `${
      getPublicOrigin(
        requestUrl,
        requestHeaders,
      )
    }${basePath}/{z}/{x}/{y}.mvt`;
  const bounds = Array.isArray(metadata.bounds)
    ? metadata.bounds
    : [-180, -85.05112878, 180, 85.05112878];
  const center = Array.isArray(metadata.center) ? metadata.center : undefined;
  const vectorLayers = Array.isArray(metadata.vector_layers)
    ? metadata.vector_layers
    : [];
  const minzoom = typeof metadata.minzoom === "number"
    ? metadata.minzoom
    : header.minZoom;
  const maxzoom = typeof metadata.maxzoom === "number"
    ? metadata.maxzoom
    : header.maxZoom;

  return {
    tilejson: "3.0.0",
    name: typeof metadata.name === "string" ? metadata.name : tileset,
    attribution: typeof metadata.attribution === "string"
      ? metadata.attribution
      : undefined,
    description: typeof metadata.description === "string"
      ? metadata.description
      : undefined,
    version: typeof metadata.version === "string" ? metadata.version : "1.0.0",
    scheme: "xyz",
    tiles: [tileUrl],
    minzoom,
    maxzoom,
    bounds,
    center,
    vector_layers: vectorLayers,
  };
}

class SupabaseStorageRangeSource {
  readonly #url: string;
  readonly #serviceRoleKey: string;

  constructor(
    supabaseUrl: string,
    bucket: string,
    objectPath: string,
    serviceRoleKey: string,
  ) {
    this.#url = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${
      encodeURIComponent(bucket)
    }/${encodePath(objectPath)}`;
    this.#serviceRoleKey = serviceRoleKey;
  }

  getKey(): string {
    return this.#url;
  }

  async getBytes(
    offset: number,
    length: number,
    signal?: AbortSignal,
  ): Promise<RangeResponse> {
    const end = offset + length - 1;
    const response = await fetch(this.#url, {
      headers: {
        Authorization: `Bearer ${this.#serviceRoleKey}`,
        apikey: this.#serviceRoleKey,
        Range: `bytes=${offset}-${end}`,
      },
      signal,
    });

    if (response.status !== 206) {
      throw new StorageRangeFetchError(response.status);
    }

    return {
      data: await response.arrayBuffer(),
      etag: response.headers.get("etag") ?? undefined,
      cacheControl: response.headers.get("cache-control") ?? undefined,
      expires: response.headers.get("expires") ?? undefined,
    };
  }
}

class StorageRangeFetchError extends Error {
  constructor(readonly storageStatus: number) {
    super(`storage_range_fetch_failed:${storageStatus}`);
    this.name = "StorageRangeFetchError";
  }
}

export async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "method_not_allowed" }, 405, {
      Allow: "GET, OPTIONS",
    });
  }

  const config = readEnvConfig();
  if (!config) {
    return jsonResponse({ error: "server_misconfigured" }, 500);
  }

  if (config.allowlist.size === 0) {
    return jsonResponse({ error: "tileset_allowlist_required" }, 403);
  }

  const url = new URL(req.url);
  const route = parseRoute(url.pathname);

  if (route.kind === "bad_request") {
    return jsonResponse({ error: route.error }, 400);
  }

  if (route.kind === "not_found") {
    return jsonResponse({ error: "not_found" }, 404);
  }

  if (route.kind === "static") {
    return serveStaticObject(config, route.objectPath, route.contentType);
  }

  if (!isTilesetAllowed(route.tileset, config.allowlist)) {
    return jsonResponse({ error: "not_found" }, 404);
  }

  return route.kind === "tilejson"
    ? serveTileJson(config, url, req.headers, route.tileset)
    : serveTile(config, route);
}

async function serveTileJson(
  config: EnvConfig,
  requestUrl: URL,
  requestHeaders: Headers,
  tileset: string,
): Promise<Response> {
  try {
    const pmtiles = createPmtiles(config, `${tileset}.pmtiles`);
    const [header, metadata] = await Promise.all([
      pmtiles.getHeader(),
      pmtiles.getMetadata(),
    ]);
    const tileJson = buildTileJson(
      requestUrl,
      tileset,
      header as unknown as Record<string, unknown>,
      metadata as Record<string, unknown>,
      requestHeaders,
      config.publicBaseUrl,
    );
    return jsonResponse(tileJson, 200, { "Cache-Control": JSON_CACHE_CONTROL });
  } catch (error) {
    const classified = classifyTileUpstreamError(error, "tileset_not_found");
    return jsonResponse({ error: classified.error }, classified.status);
  }
}

async function serveTile(
  config: EnvConfig,
  route: Extract<Route, { kind: "tile" }>,
): Promise<Response> {
  try {
    const pmtiles = createPmtiles(config, `${route.tileset}.pmtiles`);
    const tile = await pmtiles.getZxy(route.z, route.x, route.y);

    if (!tile) {
      return jsonResponse({ error: "tile_not_found" }, 404);
    }

    return new Response(tile.data, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Cache-Control": TILE_CACHE_CONTROL,
        "Content-Type": "application/vnd.mapbox-vector-tile",
      },
    });
  } catch (error) {
    const classified = classifyTileUpstreamError(error, "tile_not_found");
    return jsonResponse({ error: classified.error }, classified.status);
  }
}

function classifyTileUpstreamError(
  error: unknown,
  notFoundError: Extract<
    TileUpstreamErrorCode,
    "tileset_not_found" | "tile_not_found"
  >,
): TileUpstreamErrorResponse {
  if (error instanceof StorageRangeFetchError) {
    if (error.storageStatus === 404) {
      return { error: notFoundError, status: 404 };
    }

    if (error.storageStatus === 401 || error.storageStatus === 403) {
      return { error: "storage_auth_failed", status: 502 };
    }

    if (error.storageStatus === 416) {
      return { error: "storage_range_invalid", status: 502 };
    }

    return { error: "storage_upstream_error", status: 502 };
  }

  if (error instanceof TypeError) {
    return { error: "storage_upstream_error", status: 502 };
  }

  return { error: "tile_processing_failed", status: 500 };
}

async function serveStaticObject(
  config: EnvConfig,
  objectPath: string,
  contentType: string,
): Promise<Response> {
  if (!isSafeObjectPath(objectPath)) {
    return jsonResponse({ error: "invalid_path" }, 400);
  }

  const response = await fetchStaticStorageObject(config, objectPath);
  if (!(response instanceof Response)) {
    return jsonResponse({ error: response.error }, response.status);
  }

  const headers = new Headers(corsHeaders);
  headers.set("Content-Type", contentType);
  headers.set(
    "Cache-Control",
    response.headers.get("cache-control") ?? STATIC_CACHE_CONTROL,
  );

  const etag = response.headers.get("etag");
  if (etag) {
    headers.set("ETag", etag);
  }

  return new Response(response.body, { status: 200, headers });
}

async function fetchStaticStorageObject(
  config: EnvConfig,
  objectPath: string,
): Promise<Response | { error: StaticStorageErrorCode; status: number }> {
  try {
    const response = await fetchStorageObject(config, objectPath);
    if (response.ok) {
      return response;
    }

    if (response.status === 404) {
      return { error: "not_found", status: 404 };
    }

    if (response.status === 401 || response.status === 403) {
      return { error: "storage_auth_failed", status: 502 };
    }

    return { error: "storage_upstream_error", status: 502 };
  } catch (_error) {
    return { error: "storage_upstream_error", status: 502 };
  }
}

function parseStaticRoute(routeSegments: string[]): Route | undefined {
  const [category, ...rest] = routeSegments;
  if (
    !category || rest.length === 0 ||
    !isSafePathSegment(category) ||
    !rest.every((segment) => isSafeStaticPathSegment(segment))
  ) {
    return undefined;
  }

  if (category === "styles" && rest.length === 1 && rest[0].endsWith(".json")) {
    return {
      kind: "static",
      objectPath: `styles/${rest[0]}`,
      contentType: "application/json; charset=utf-8",
    };
  }

  if (category === "sprites") {
    const file = rest.at(-1) ?? "";
    const contentType = spriteContentType(file);
    if (!contentType) {
      return undefined;
    }

    return {
      kind: "static",
      objectPath: `sprites/${rest.join("/")}`,
      contentType,
    };
  }

  if (
    (category === "fonts" || category === "glyphs") && rest.length >= 2 &&
    rest.at(-1)?.endsWith(".pbf")
  ) {
    return {
      kind: "static",
      objectPath: `${category}/${rest.join("/")}`,
      contentType: "application/x-protobuf",
    };
  }

  return undefined;
}

function spriteContentType(file: string): string | undefined {
  if (file.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }

  if (file.endsWith(".png")) {
    return "image/png";
  }

  if (file.endsWith(".webp")) {
    return "image/webp";
  }

  return undefined;
}

function createPmtiles(config: EnvConfig, objectPath: string): PMTiles {
  const source = new SupabaseStorageRangeSource(
    config.supabaseUrl,
    config.bucket,
    objectPath,
    config.serviceRoleKey,
  );
  return new PMTiles(source);
}

function readEnvConfig(): EnvConfig | undefined {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return undefined;
  }

  return {
    bucket: Deno.env.get("MAP_TILES_BUCKET") ?? DEFAULT_BUCKET,
    allowlist: parseTilesetAllowlist(Deno.env.get("MAP_TILESET_ALLOWLIST")),
    publicBaseUrl: Deno.env.get("MAP_TILES_PUBLIC_BASE_URL") || undefined,
    supabaseUrl,
    serviceRoleKey,
  };
}

function fetchStorageObject(
  config: EnvConfig,
  objectPath: string,
): Promise<Response> {
  const url = `${config.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${
    encodeURIComponent(config.bucket)
  }/${encodePath(objectPath)}`;
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${config.serviceRoleKey}`,
      apikey: config.serviceRoleKey,
    },
  });
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...jsonHeaders,
      ...extraHeaders,
    },
  });
}

function splitPath(pathname: string): string[] | undefined {
  try {
    return pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));
  } catch (_error) {
    return undefined;
  }
}

function getPublicOrigin(requestUrl: URL, requestHeaders: Headers): string {
  const forwardedHost = firstForwardedValue(
    requestHeaders.get("x-forwarded-host"),
  );
  const forwardedProto = firstForwardedValue(
    requestHeaders.get("x-forwarded-proto"),
  );

  if (forwardedHost) {
    const proto = forwardedProto ?? requestUrl.protocol.replace(/:$/, "");
    return `${proto}://${forwardedHost}`;
  }

  return requestUrl.origin;
}

function firstForwardedValue(value: string | null): string | undefined {
  return value?.split(",").at(0)?.trim() || undefined;
}

function stripTileJsonSuffix(pathname: string): string {
  return pathname.replace(/\.json$/, "");
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

if (import.meta.main) {
  serve(handleRequest);
}
