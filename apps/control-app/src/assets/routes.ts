export interface AssetsEnv {
  ASSETS_BUCKET: R2Bucket;
}

const LIST_PATH = "/api/assets/list";
const PUT_PREFIX = "/api/assets/put/";
const DELETE_PREFIX = "/api/assets/delete/";
const GET_PREFIX = "/assets/";

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function decodeKey(raw: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (decoded.length === 0) return null;
  if (decoded.includes("..")) return null;
  if (decoded.startsWith("/")) return null;
  return decoded;
}

export function matchAssetsRoute(url: URL): boolean {
  return (
    url.pathname === LIST_PATH ||
    url.pathname.startsWith(PUT_PREFIX) ||
    url.pathname.startsWith(DELETE_PREFIX) ||
    url.pathname.startsWith(GET_PREFIX)
  );
}

export async function handleAssetsRequest(
  request: Request,
  env: AssetsEnv,
): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === LIST_PATH) {
    if (request.method !== "GET") return jsonError("GET required", 405);
    return await handleList(env, url);
  }

  if (url.pathname.startsWith(PUT_PREFIX)) {
    if (request.method !== "PUT") return jsonError("PUT required", 405);
    const key = decodeKey(url.pathname.slice(PUT_PREFIX.length));
    if (!key) return jsonError("invalid asset key", 400);
    return await handlePut(env, request, key);
  }

  if (url.pathname.startsWith(DELETE_PREFIX)) {
    if (request.method !== "DELETE") return jsonError("DELETE required", 405);
    const key = decodeKey(url.pathname.slice(DELETE_PREFIX.length));
    if (!key) return jsonError("invalid asset key", 400);
    return await handleDelete(env, key);
  }

  if (url.pathname.startsWith(GET_PREFIX)) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return jsonError("GET required", 405);
    }
    const key = decodeKey(url.pathname.slice(GET_PREFIX.length));
    if (!key) return jsonError("invalid asset key", 400);
    return await handleGet(env, key, request.method === "HEAD");
  }

  return jsonError("not found", 404);
}

async function handleList(env: AssetsEnv, url: URL): Promise<Response> {
  const prefix = url.searchParams.get("prefix") ?? undefined;
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const list = await env.ASSETS_BUCKET.list({ prefix, cursor, limit: 1000 });
  const items = list.objects.map((o) => ({
    key: o.key,
    size: o.size,
    etag: o.httpEtag ?? o.etag,
    uploaded: o.uploaded instanceof Date ? o.uploaded.toISOString() : String(o.uploaded),
    contentType: o.httpMetadata?.contentType ?? "application/octet-stream",
  }));
  return new Response(
    JSON.stringify({
      items,
      truncated: list.truncated,
      cursor: list.truncated ? list.cursor : null,
    }),
    { status: 200, headers: { "content-type": "application/json; charset=utf-8" } },
  );
}

async function handlePut(env: AssetsEnv, request: Request, key: string): Promise<Response> {
  const contentType =
    request.headers.get("content-type") ?? "application/octet-stream";
  const ifMatch = request.headers.get("if-match");

  if (ifMatch) {
    const existing = await env.ASSETS_BUCKET.head(key);
    if (!existing) {
      return jsonError("if-match supplied but object does not exist", 412);
    }
    const existingEtag = existing.httpEtag ?? existing.etag;
    if (normalizeEtag(existingEtag) !== normalizeEtag(ifMatch)) {
      return new Response(
        JSON.stringify({ error: "precondition_failed", expected: existingEtag }),
        {
          status: 412,
          headers: { "content-type": "application/json; charset=utf-8" },
        },
      );
    }
  }

  if (!request.body) return jsonError("body required", 400);
  // Buffer the body before handing to R2: the Miniflare-backed local R2
  // emulator (used by `wrangler dev` and our AC17 test) refuses streams
  // without a known content-length. Asset uploads are small enough that
  // buffering is the right default; revisit when very large assets land.
  const bodyBytes = new Uint8Array(await request.arrayBuffer());
  const written = await env.ASSETS_BUCKET.put(key, bodyBytes, {
    httpMetadata: { contentType },
  });
  if (!written) return jsonError("write failed", 500);

  return new Response(
    JSON.stringify({
      key,
      size: written.size,
      etag: written.httpEtag ?? written.etag,
      contentType,
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        etag: written.httpEtag ?? written.etag,
      },
    },
  );
}

async function handleGet(env: AssetsEnv, key: string, headOnly: boolean): Promise<Response> {
  if (headOnly) {
    const meta = await env.ASSETS_BUCKET.head(key);
    if (!meta) return jsonError("not found", 404);
    const ct = meta.httpMetadata?.contentType ?? "application/octet-stream";
    const headers = new Headers({
      "content-type": ct,
      etag: meta.httpEtag ?? meta.etag,
    });
    if (typeof meta.size === "number") headers.set("content-length", String(meta.size));
    return new Response(null, { status: 200, headers });
  }
  const obj = await env.ASSETS_BUCKET.get(key);
  if (!obj) return jsonError("not found", 404);
  const ct = obj.httpMetadata?.contentType ?? "application/octet-stream";
  const headers = new Headers({
    "content-type": ct,
    etag: obj.httpEtag ?? obj.etag,
  });
  if (typeof obj.size === "number") headers.set("content-length", String(obj.size));
  return new Response(obj.body, { status: 200, headers });
}

async function handleDelete(env: AssetsEnv, key: string): Promise<Response> {
  await env.ASSETS_BUCKET.delete(key);
  return new Response(null, { status: 204 });
}

function normalizeEtag(etag: string): string {
  return etag.replace(/^W\//, "").replace(/^"|"$/g, "");
}
