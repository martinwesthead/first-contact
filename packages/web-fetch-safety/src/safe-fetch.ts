import type {
  SafeFetchResult,
  SafeFetchSuccess,
  SafeFetchFailure,
  SafetyEnv,
} from "./types.js";
import { validateTarget } from "./validate-target.js";
import { sha256Hex } from "./hash.js";

export const MAX_REDIRECTS = 5;
export const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB
export const CACHE_TTL_SECONDS = 60 * 60; // 1 h

export type SafeFetchOptions = {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
  range?: string;
  cacheEnabled?: boolean;
  allowHttpForOrigin?: string;
  fetchImpl?: typeof fetch;
};

type CacheEntry = {
  status: number;
  headers: Record<string, string>;
  bodyBase64: string;
  finalUrl: string;
  redirects: number;
};

function fail(reason: SafeFetchFailure["reason"], detail?: string): SafeFetchFailure {
  return { ok: false, reason, detail };
}

async function readWithCap(body: ReadableStream<Uint8Array> | null): Promise<Uint8Array | null> {
  if (!body) return new Uint8Array(0);
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      try {
        await reader.cancel();
      } catch {
        // ignore
      }
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function cacheKey(method: string, url: string, range: string | undefined): Promise<string> {
  return "resp:" + (await sha256Hex(`${method}|${url}|${range ?? ""}`));
}

export async function safeFetch(
  rawUrl: string,
  env: SafetyEnv,
  opts: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const method = (opts.method ?? "GET").toUpperCase();
  const cacheEnabled = opts.cacheEnabled !== false && method === "GET";
  const fetchImpl = opts.fetchImpl ?? fetch;

  if (cacheEnabled) {
    const key = await cacheKey(method, rawUrl, opts.range);
    const cached = await env.FETCH_CACHE_KV.get(key, "json");
    if (cached) {
      const entry = cached as CacheEntry;
      const headers = new Headers(entry.headers);
      headers.set("x-fetch-cache", "HIT");
      return {
        ok: true,
        status: entry.status,
        headers,
        body: base64ToBytes(entry.bodyBase64),
        finalUrl: entry.finalUrl,
        redirects: entry.redirects,
        cacheStatus: "HIT",
      };
    }
  }

  let currentUrl = rawUrl;
  let allowHttpForOrigin = opts.allowHttpForOrigin;
  let redirects = 0;

  while (true) {
    const check = validateTarget(currentUrl, { allowHttpForOrigin });
    if (!check.ok) {
      return fail(check.reason, check.detail);
    }

    let res: Response;
    try {
      res = await fetchImpl(check.url.toString(), {
        method,
        headers: opts.headers,
        body: method === "GET" || method === "HEAD" ? undefined : opts.body ?? undefined,
        redirect: "manual",
      });
    } catch (e) {
      return fail("network_error", e instanceof Error ? e.message : String(e));
    }

    if (res.status >= 300 && res.status < 400 && res.headers.has("location")) {
      if (redirects >= MAX_REDIRECTS) {
        return fail("too_many_redirects");
      }
      redirects++;
      const location = res.headers.get("location") as string;
      try {
        currentUrl = new URL(location, check.url).toString();
      } catch {
        return fail("invalid_url", "bad_location_header");
      }
      // Each hop is treated as a fresh validation. http-allowance from
      // the original call does NOT carry to redirected targets — operator
      // intent was scoped to the original origin only.
      allowHttpForOrigin = undefined;
      try {
        await res.body?.cancel();
      } catch {
        // ignore
      }
      continue;
    }

    const body = await readWithCap(res.body);
    if (body === null) {
      return fail("body_too_large");
    }

    const success: SafeFetchSuccess = {
      ok: true,
      status: res.status,
      headers: new Headers(res.headers),
      body,
      finalUrl: check.url.toString(),
      redirects,
      cacheStatus: "MISS",
    };
    success.headers.set("x-fetch-cache", "MISS");

    if (cacheEnabled && res.status >= 200 && res.status < 300) {
      const key = await cacheKey(method, rawUrl, opts.range);
      const headerObj: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        headerObj[k] = v;
      });
      const entry: CacheEntry = {
        status: res.status,
        headers: headerObj,
        bodyBase64: bytesToBase64(body),
        finalUrl: success.finalUrl,
        redirects: success.redirects,
      };
      await env.FETCH_CACHE_KV.put(key, JSON.stringify(entry), {
        expirationTtl: CACHE_TTL_SECONDS,
      });
    }

    return success;
  }
}
