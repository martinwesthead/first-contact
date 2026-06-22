import { safeFetch, type SafeFetchOptions } from "@gendev/web-fetch-safety";
import type { SafetyEnv } from "@gendev/web-fetch-safety";
import type { R2BucketLike } from "./upload-screenshots.js";

/**
 * Minimal contract for the safeFetch implementation injected into
 * mirrorAssetToR2. Production callers pass the real `safeFetch`; tests can
 * pass an in-memory shim that satisfies the same shape.
 */
export type SafeFetchFn = typeof safeFetch;

export type MirrorAssetFailureReason =
  | "body_too_large"
  | "non_2xx"
  | "ssrf_blocked"
  | "rate_limited"
  | "requires_robots_override"
  | "missing_intent"
  | "network_error"
  | "invalid_url"
  | "unsupported_scheme"
  | "r2_put_failed"
  | "unknown";

export interface MirrorAssetSuccess {
  readonly ok: true;
  readonly url: string;
  readonly r2Key: string;
  readonly contentType: string;
  readonly bytes: number;
  readonly fromCache?: boolean;
}

export interface MirrorAssetFailure {
  readonly ok: false;
  readonly url: string;
  readonly reason: MirrorAssetFailureReason;
  readonly detail?: string;
}

export type MirrorAssetResult = MirrorAssetSuccess | MirrorAssetFailure;

export interface MirrorAssetArgs {
  /** Absolute URL of the asset to fetch and mirror. */
  readonly url: string;
  /** Owning site id — used to namespace the R2 key. */
  readonly siteId: string;
  /** Worker-bound R2 bucket the mirrored bytes are written to. */
  readonly bucket: R2BucketLike;
  /** safeFetch env for KV cache + robots cache. */
  readonly safetyEnv: SafetyEnv;
  /** Optional safeFetch overrides (custom fetchImpl in tests, headers). */
  readonly safeFetchOptions?: SafeFetchOptions;
  /** Injectable safeFetch implementation. Default: the real one. */
  readonly safeFetchImpl?: SafeFetchFn;
}

interface ExtensionMapping {
  readonly extension: string;
  readonly defaultContentType: string;
}

const EXT_BY_CONTENT_TYPE: ReadonlyMap<string, ExtensionMapping> = new Map([
  ["image/png", { extension: "png", defaultContentType: "image/png" }],
  ["image/jpeg", { extension: "jpg", defaultContentType: "image/jpeg" }],
  ["image/jpg", { extension: "jpg", defaultContentType: "image/jpeg" }],
  ["image/webp", { extension: "webp", defaultContentType: "image/webp" }],
  ["image/svg+xml", { extension: "svg", defaultContentType: "image/svg+xml" }],
  ["image/gif", { extension: "gif", defaultContentType: "image/gif" }],
  ["image/avif", { extension: "avif", defaultContentType: "image/avif" }],
  ["video/mp4", { extension: "mp4", defaultContentType: "video/mp4" }],
  ["video/webm", { extension: "webm", defaultContentType: "video/webm" }],
  ["video/quicktime", { extension: "mov", defaultContentType: "video/quicktime" }],
]);

/**
 * Resolve `Content-Type` to a (extension, normalised content-type) pair. Falls
 * back to `bin` when the type is unknown — we still mirror the bytes so the
 * caller can decide whether to surface or drop, but the extension makes it
 * obvious the file's type is unverified.
 */
export function classifyContentType(rawType: string | null): ExtensionMapping {
  if (!rawType) return { extension: "bin", defaultContentType: "application/octet-stream" };
  const lowered = rawType.split(";")[0]?.trim().toLowerCase() ?? "";
  return (
    EXT_BY_CONTENT_TYPE.get(lowered) ?? {
      extension: "bin",
      defaultContentType: lowered || "application/octet-stream",
    }
  );
}

/**
 * Deterministic SHA-256 hex of the absolute URL, truncated to 16 chars. This
 * is the dedup key — same URL always collapses to the same R2 object.
 */
export async function urlContentHash(url: string): Promise<string> {
  const data = new TextEncoder().encode(url);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex.slice(0, 16);
}

export async function r2KeyFor(args: {
  readonly url: string;
  readonly siteId: string;
  readonly extension: string;
}): Promise<string> {
  const hash = await urlContentHash(args.url);
  return `sites/${args.siteId}/imports/${hash}.${args.extension}`;
}

/**
 * Download a single asset URL via the REQ-20 safety layer and write the bytes
 * to R2 at `sites/{siteId}/imports/{sha256(url):16}.{ext}`. Pure I/O —
 * returns a structured outcome including the failure reason so the caller can
 * surface "{N} mirrored, {M} failed: {url} (body_too_large), ..." in chat.
 *
 * Idempotent: same `url` + same `siteId` always produces the same key; a
 * second call to mirrorAssetToR2 with the same URL overwrites the same key
 * with the same bytes (no rollback needed).
 */
export async function mirrorAssetToR2(args: MirrorAssetArgs): Promise<MirrorAssetResult> {
  const safeFetchFn = args.safeFetchImpl ?? safeFetch;

  let parsed: URL;
  try {
    parsed = new URL(args.url);
  } catch {
    return { ok: false, url: args.url, reason: "invalid_url" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, url: args.url, reason: "unsupported_scheme" };
  }

  const fetched = await safeFetchFn(args.url, args.safetyEnv, args.safeFetchOptions);
  if (!fetched.ok) {
    const reason = mapSafeFetchFailure(fetched.reason);
    return { ok: false, url: args.url, reason, detail: fetched.detail };
  }
  if (fetched.status < 200 || fetched.status >= 300) {
    return {
      ok: false,
      url: args.url,
      reason: "non_2xx",
      detail: `status ${fetched.status}`,
    };
  }

  const contentTypeHeader = fetched.headers.get("content-type");
  const { extension, defaultContentType } = classifyContentType(contentTypeHeader);
  const key = await r2KeyFor({
    url: args.url,
    siteId: args.siteId,
    extension,
  });

  try {
    await args.bucket.put(key, fetched.body, {
      httpMetadata: { contentType: defaultContentType },
    });
  } catch (err) {
    return {
      ok: false,
      url: args.url,
      reason: "r2_put_failed",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  return {
    ok: true,
    url: args.url,
    r2Key: key,
    contentType: defaultContentType,
    bytes: fetched.body.byteLength,
    fromCache: fetched.cacheStatus === "HIT",
  };
}

function mapSafeFetchFailure(
  reason:
    | "private_ip"
    | "disallowed_scheme"
    | "invalid_url"
    | "missing_host"
    | "too_many_redirects"
    | "body_too_large"
    | "network_error"
    | "requires_robots_override"
    | "missing_intent"
    | "rate_limited"
    | "budget_exhausted",
): MirrorAssetFailureReason {
  switch (reason) {
    case "private_ip":
    case "disallowed_scheme":
    case "invalid_url":
    case "missing_host":
    case "too_many_redirects":
      return "ssrf_blocked";
    case "body_too_large":
      return "body_too_large";
    case "network_error":
    case "budget_exhausted":
      return "network_error";
    case "requires_robots_override":
      return "requires_robots_override";
    case "missing_intent":
      return "missing_intent";
    case "rate_limited":
      return "rate_limited";
    default:
      return "unknown";
  }
}

export interface MirrorBatchArgs {
  readonly urls: ReadonlyArray<string>;
  readonly siteId: string;
  readonly bucket: R2BucketLike;
  readonly safetyEnv: SafetyEnv;
  readonly safeFetchOptions?: SafeFetchOptions;
  readonly safeFetchImpl?: SafeFetchFn;
  readonly concurrency?: number;
  readonly onResult?: (r: MirrorAssetResult) => void;
}

export interface MirrorBatchResult {
  readonly successes: ReadonlyArray<MirrorAssetSuccess>;
  readonly failures: ReadonlyArray<MirrorAssetFailure>;
  readonly urlToR2Key: ReadonlyMap<string, string>;
}

const DEFAULT_CONCURRENCY = 4;

/**
 * Mirror many URLs to R2 in parallel with a fixed concurrency cap. Dedupes
 * the input URL list (same URL only fetched once even if it appears multiple
 * times). Emits each result via `onResult` as it lands so the orchestrator
 * can push SSE progress events.
 */
export async function mirrorAssetBatchToR2(
  args: MirrorBatchArgs,
): Promise<MirrorBatchResult> {
  const unique = [...new Set(args.urls)];
  const concurrency = Math.max(1, args.concurrency ?? DEFAULT_CONCURRENCY);
  const successes: MirrorAssetSuccess[] = [];
  const failures: MirrorAssetFailure[] = [];
  const urlToR2Key = new Map<string, string>();

  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < unique.length) {
      const i = cursor++;
      const url = unique[i];
      const result = await mirrorAssetToR2({
        url,
        siteId: args.siteId,
        bucket: args.bucket,
        safetyEnv: args.safetyEnv,
        safeFetchOptions: args.safeFetchOptions,
        safeFetchImpl: args.safeFetchImpl,
      });
      if (result.ok) {
        successes.push(result);
        urlToR2Key.set(result.url, result.r2Key);
      } else {
        failures.push(result);
      }
      args.onResult?.(result);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, unique.length) }, () => worker()),
  );

  return { successes, failures, urlToR2Key };
}
