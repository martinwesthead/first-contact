import { describe, expect, it } from "vitest";
import {
  mirrorAssetBatchToR2,
  mirrorAssetToR2,
  r2KeyFor,
  urlContentHash,
  type MirrorAssetFailureReason,
  type SafeFetchFn,
} from "../packages/extractor/src/mirror-asset.js";
import { makeMemR2 } from "./_helpers_REQ-20_r2.js";
import { makeMemKv } from "./_helpers_REQ-20_kv.js";

// safeFetch never actually runs in these UATs (safeFetchImpl is always
// injected), but mirrorAssetToR2 still threads the SafetyEnv through, so we
// hand it the same in-memory KV namespaces the real safety layer expects.
const SAFETY_ENV = () =>
  ({
    FETCH_CACHE_KV: makeMemKv(),
    FETCH_ROBOTS_KV: makeMemKv(),
  }) as never;

/** A safeFetch shim returning a 2xx body for known URLs (network_error otherwise). */
function makeStubFetch(
  responses: Record<string, { status: number; contentType?: string; body: Uint8Array }>,
): SafeFetchFn {
  return (async (url: string) => {
    const entry = responses[url];
    if (!entry) {
      return { ok: false as const, reason: "network_error" as const, detail: `no stub for ${url}` };
    }
    const headers = new Headers();
    if (entry.contentType) headers.set("content-type", entry.contentType);
    return {
      ok: true as const,
      status: entry.status,
      headers,
      body: entry.body,
      finalUrl: url,
      redirects: 0,
      cacheStatus: "MISS" as const,
    };
  }) as unknown as SafeFetchFn;
}

type SafeFetchFailReason =
  | "body_too_large"
  | "private_ip"
  | "disallowed_scheme"
  | "too_many_redirects"
  | "requires_robots_override"
  | "rate_limited"
  | "missing_intent"
  | "network_error"
  | "budget_exhausted";

/** A safeFetch shim returning a typed safety-layer failure for known URLs. */
function makeStubFailingFetch(
  failures: Record<string, { reason: SafeFetchFailReason; detail?: string }>,
): SafeFetchFn {
  return (async (url: string) => {
    const f = failures[url];
    if (f) return { ok: false as const, reason: f.reason, detail: f.detail };
    return { ok: false as const, reason: "network_error" as const };
  }) as unknown as SafeFetchFn;
}

describe("Story story-5d1952ba: Convert flow mirrors referenced assets into platform storage", () => {
  // AC-645 — Single asset is mirrored to a content-addressed key with a success result.
  it("test_UAT_AC645_single_asset_mirrored_to_content_addressed_key", async () => {
    const bucket = makeMemR2();
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x11, 0x22]);
    const url = "https://acme.test/hero.png";

    const result = await mirrorAssetToR2({
      url,
      siteId: "site-1",
      bucket,
      safetyEnv: SAFETY_ENV(),
      safeFetchImpl: makeStubFetch({ [url]: { status: 200, contentType: "image/png", body: png } }),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Content-addressed key: sites/{siteId}/imports/{16 hex}.{ext}
    expect(result.r2Key).toMatch(/^sites\/site-1\/imports\/[0-9a-f]{16}\.png$/);
    expect(result.contentType).toBe("image/png");
    expect(result.bytes).toBe(png.byteLength);

    // Stored bytes are byte-for-byte identical to the fetched body.
    const obj = await bucket.get(result.r2Key);
    expect(obj).not.toBeNull();
    const stored = new Uint8Array(await obj!.arrayBuffer());
    expect(stored).toEqual(png);
  });

  // AC-646 — Content-Type maps to the correct extension, with .bin fallback.
  it("test_UAT_AC646_content_type_maps_to_extension_with_bin_fallback", async () => {
    const supported: Array<{ contentType: string; ext: string; canonical: string }> = [
      { contentType: "image/png", ext: "png", canonical: "image/png" },
      { contentType: "image/jpeg", ext: "jpg", canonical: "image/jpeg" },
      { contentType: "image/webp", ext: "webp", canonical: "image/webp" },
      { contentType: "image/svg+xml", ext: "svg", canonical: "image/svg+xml" },
      { contentType: "image/gif", ext: "gif", canonical: "image/gif" },
      { contentType: "image/avif", ext: "avif", canonical: "image/avif" },
      { contentType: "video/mp4", ext: "mp4", canonical: "video/mp4" },
      { contentType: "video/webm", ext: "webm", canonical: "video/webm" },
      { contentType: "video/quicktime", ext: "mov", canonical: "video/quicktime" },
      // charset/parameter suffix is ignored — resolves to the base type.
      { contentType: "image/png; charset=binary", ext: "png", canonical: "image/png" },
    ];

    for (const { contentType, ext, canonical } of supported) {
      const bucket = makeMemR2();
      const url = `https://acme.test/asset-${ext}-${contentType.replace(/\W/g, "")}`;
      const result = await mirrorAssetToR2({
        url,
        siteId: "site-x",
        bucket,
        safetyEnv: SAFETY_ENV(),
        safeFetchImpl: makeStubFetch({ [url]: { status: 200, contentType, body: new Uint8Array([1, 2, 3]) } }),
      });
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.r2Key.endsWith(`.${ext}`)).toBe(true);
      expect(result.contentType).toBe(canonical);
    }

    // Missing Content-Type and unrecognized Content-Type both fall back to .bin
    // (application/octet-stream) — and the bytes are still stored.
    const binCases: Array<{ url: string; contentType?: string }> = [
      { url: "https://acme.test/no-ctype" },
      { url: "https://acme.test/weird", contentType: "application/x-unknown-thing" },
    ];
    for (const { url, contentType } of binCases) {
      const bucket = makeMemR2();
      const result = await mirrorAssetToR2({
        url,
        siteId: "site-x",
        bucket,
        safetyEnv: SAFETY_ENV(),
        safeFetchImpl: makeStubFetch({ [url]: { status: 200, contentType, body: new Uint8Array([9]) } }),
      });
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.r2Key.endsWith(".bin")).toBe(true);
      // Object was still written despite the unverified type.
      const obj = await bucket.get(result.r2Key);
      expect(obj).not.toBeNull();
    }
  });

  // AC-647 — Download failures surface a named reason and write nothing to storage.
  it("test_UAT_AC647_failures_surface_named_reason_and_write_nothing", async () => {
    // Safety-layer failures map to the stable mirror taxonomy.
    const safetyCases: Array<{ inject: SafeFetchFailReason; expect: MirrorAssetFailureReason }> = [
      { inject: "body_too_large", expect: "body_too_large" },
      { inject: "private_ip", expect: "ssrf_blocked" },
      { inject: "disallowed_scheme", expect: "ssrf_blocked" },
      { inject: "too_many_redirects", expect: "ssrf_blocked" },
      { inject: "requires_robots_override", expect: "requires_robots_override" },
      { inject: "rate_limited", expect: "rate_limited" },
    ];
    for (const { inject, expect: expectedReason } of safetyCases) {
      const bucket = makeMemR2();
      const url = `https://acme.test/${inject}.png`;
      const result = await mirrorAssetToR2({
        url,
        siteId: "site-1",
        bucket,
        safetyEnv: SAFETY_ENV(),
        safeFetchImpl: makeStubFailingFetch({ [url]: { reason: inject } }),
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.url).toBe(url);
        expect(result.reason).toBe(expectedReason);
      }
      // Nothing written on failure.
      const list = await bucket.list();
      expect(list.objects.length).toBe(0);
    }

    // Non-2xx → non_2xx, with the status carried in the detail; nothing written.
    {
      const bucket = makeMemR2();
      const url = "https://acme.test/missing.png";
      const result = await mirrorAssetToR2({
        url,
        siteId: "site-1",
        bucket,
        safetyEnv: SAFETY_ENV(),
        safeFetchImpl: makeStubFetch({
          [url]: { status: 404, contentType: "text/html", body: new TextEncoder().encode("nope") },
        }),
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("non_2xx");
        expect(result.detail).toMatch(/404/);
      }
      const list = await bucket.list();
      expect(list.objects.length).toBe(0);
    }

    // Non-http(s) scheme → unsupported_scheme, and safeFetch is never invoked.
    {
      let called = false;
      const safeFetchImpl: SafeFetchFn = (async () => {
        called = true;
        return { ok: false as const, reason: "network_error" as const };
      }) as unknown as SafeFetchFn;
      const bucket = makeMemR2();
      const result = await mirrorAssetToR2({
        url: "data:image/png;base64,iVBORw==",
        siteId: "site-1",
        bucket,
        safetyEnv: SAFETY_ENV(),
        safeFetchImpl,
      });
      expect(called).toBe(false);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("unsupported_scheme");
      const list = await bucket.list();
      expect(list.objects.length).toBe(0);
    }
  });

  // AC-648 — Batch mirror dedupes URLs and aggregates successes, failures, and a URL→key map.
  it("test_UAT_AC648_batch_dedupes_and_aggregates_successes_failures_and_keymap", async () => {
    // Part 1: a duplicated URL is fetched exactly once per unique URL.
    {
      let calls = 0;
      const safeFetchImpl: SafeFetchFn = (async (url: string) => {
        calls++;
        return {
          ok: true as const,
          status: 200,
          headers: new Headers({ "content-type": "image/jpeg" }),
          body: new Uint8Array([0x01, 0x02]),
          finalUrl: url,
          redirects: 0,
          cacheStatus: "MISS" as const,
        };
      }) as unknown as SafeFetchFn;

      const events: string[] = [];
      const result = await mirrorAssetBatchToR2({
        urls: [
          "https://acme.test/hero.jpg",
          "https://acme.test/hero.jpg",
          "https://acme.test/other.jpg",
          "https://acme.test/hero.jpg",
        ],
        siteId: "site-1",
        bucket: makeMemR2(),
        safetyEnv: SAFETY_ENV(),
        safeFetchImpl,
        onResult: (r) => events.push(r.url),
      });

      // Two unique URLs → two fetches, two successes, two distinct keys.
      expect(calls).toBe(2);
      expect(result.successes.length).toBe(2);
      expect(result.urlToR2Key.size).toBe(2);
      expect(result.urlToR2Key.get("https://acme.test/hero.jpg")).toBeDefined();
      expect(result.urlToR2Key.get("https://acme.test/other.jpg")).toBeDefined();
      expect(result.urlToR2Key.get("https://acme.test/hero.jpg")).not.toBe(
        result.urlToR2Key.get("https://acme.test/other.jpg"),
      );
      // Per-result callback fires once per unique URL, not once per input element.
      expect(events.length).toBe(2);
    }

    // Part 2: a mixed batch returns both buckets correctly populated.
    {
      const okUrl = "https://acme.test/ok.png";
      const giantUrl = "https://acme.test/giant.png";
      const blockedUrl = "https://acme.test/blocked.png";
      const safeFetchImpl: SafeFetchFn = (async (url: string) => {
        if (url === giantUrl) return { ok: false as const, reason: "body_too_large" as const };
        if (url === blockedUrl) return { ok: false as const, reason: "requires_robots_override" as const };
        return {
          ok: true as const,
          status: 200,
          headers: new Headers({ "content-type": "image/png" }),
          body: new Uint8Array([0x10]),
          finalUrl: url,
          redirects: 0,
          cacheStatus: "MISS" as const,
        };
      }) as unknown as SafeFetchFn;

      const events: string[] = [];
      const result = await mirrorAssetBatchToR2({
        urls: [okUrl, giantUrl, blockedUrl],
        siteId: "site-1",
        bucket: makeMemR2(),
        safetyEnv: SAFETY_ENV(),
        safeFetchImpl,
        onResult: (r) => events.push(r.url),
      });

      expect(result.successes.length).toBe(1);
      expect(result.failures.length).toBe(2);
      const reasons = result.failures.map((f) => f.reason).sort();
      expect(reasons).toEqual(["body_too_large", "requires_robots_override"]);
      expect(result.urlToR2Key.size).toBe(1);
      expect(result.urlToR2Key.get(okUrl)).toBeDefined();
      // Callback fired once per unique URL processed.
      expect(events.length).toBe(3);
    }
  });

  // AC-649 — Content-addressed key is deterministic so re-mirroring a URL is idempotent.
  it("test_UAT_AC649_content_addressed_key_deterministic_and_idempotent", async () => {
    const url = "https://acme.test/hero.jpg";

    // Same URL → same 16-char hash → same key, every time.
    const h1 = await urlContentHash(url);
    const h2 = await urlContentHash(url);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{16}$/);

    const k1 = await r2KeyFor({ url, siteId: "site-1", extension: "jpg" });
    const k2 = await r2KeyFor({ url, siteId: "site-1", extension: "jpg" });
    expect(k1).toBe(k2);

    // Mirroring the same URL into the same site twice targets the same key and
    // leaves a single object in the bucket (overwrite, not a second object).
    const bucket = makeMemR2();
    const body = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const fetch = makeStubFetch({ [url]: { status: 200, contentType: "image/jpeg", body } });

    const first = await mirrorAssetToR2({ url, siteId: "site-1", bucket, safetyEnv: SAFETY_ENV(), safeFetchImpl: fetch });
    const second = await mirrorAssetToR2({ url, siteId: "site-1", bucket, safetyEnv: SAFETY_ENV(), safeFetchImpl: fetch });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.r2Key).toBe(second.r2Key);

    const list = await bucket.list();
    expect(list.objects.length).toBe(1);
    expect(list.objects[0].key).toBe(first.r2Key);
  });
});
