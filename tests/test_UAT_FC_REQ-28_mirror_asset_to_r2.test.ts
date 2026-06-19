import { describe, expect, it } from "vitest";
import {
  classifyContentType,
  mirrorAssetBatchToR2,
  mirrorAssetToR2,
  r2KeyFor,
  urlContentHash,
  type SafeFetchFn,
} from "../packages/extractor/src/mirror-asset.js";
import { makeMemR2 } from "./_helpers_REQ-20_r2.js";
import { makeMemKv } from "./_helpers_REQ-20_kv.js";

const SAFETY_ENV = () => ({
  FETCH_CACHE_KV: makeMemKv(),
  FETCH_ROBOTS_KV: makeMemKv(),
});

function makeStubFetch(
  responses: Record<string, { status: number; contentType?: string; body: Uint8Array }>,
): SafeFetchFn {
  return (async (url: string) => {
    const entry = responses[url];
    if (!entry) {
      return {
        ok: false as const,
        reason: "network_error" as const,
        detail: `no stub for ${url}`,
      };
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

function makeStubFailingFetch(
  failures: Record<
    string,
    {
      reason:
        | "body_too_large"
        | "private_ip"
        | "network_error"
        | "requires_robots_override"
        | "rate_limited"
        | "missing_intent"
        | "too_many_redirects"
        | "budget_exhausted";
      detail?: string;
    }
  >,
): SafeFetchFn {
  return (async (url: string) => {
    const f = failures[url];
    if (f) return { ok: false as const, reason: f.reason, detail: f.detail };
    return { ok: false as const, reason: "network_error" as const };
  }) as unknown as SafeFetchFn;
}

describe("UAT FC REQ-28: mirrorAssetToR2 (Stage 4 single-asset)", () => {
  it("AC9: maps Content-Type image/png to .png extension and writes to R2 with content-addressed key", async () => {
    const bucket = makeMemR2();
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const result = await mirrorAssetToR2({
      url: "https://acme.test/hero.png",
      siteId: "site-1",
      bucket,
      safetyEnv: SAFETY_ENV(),
      safeFetchImpl: makeStubFetch({
        "https://acme.test/hero.png": { status: 200, contentType: "image/png", body: png },
      }),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.r2Key).toMatch(/^sites\/site-1\/imports\/[0-9a-f]{16}\.png$/);
    expect(result.contentType).toBe("image/png");
    expect(result.bytes).toBe(png.byteLength);

    const obj = await bucket.get(result.r2Key);
    expect(obj).not.toBeNull();
    const stored = new Uint8Array(await obj!.arrayBuffer());
    expect(stored).toEqual(png);
  });

  it("AC9: maps each supported content-type to its expected extension", async () => {
    const matrix = [
      { contentType: "image/jpeg", expectExt: "jpg" },
      { contentType: "image/webp", expectExt: "webp" },
      { contentType: "image/svg+xml", expectExt: "svg" },
      { contentType: "image/gif", expectExt: "gif" },
      { contentType: "video/mp4", expectExt: "mp4" },
      { contentType: "video/webm", expectExt: "webm" },
    ];
    for (const { contentType, expectExt } of matrix) {
      const bucket = makeMemR2();
      const result = await mirrorAssetToR2({
        url: `https://acme.test/asset-${expectExt}`,
        siteId: "site-x",
        bucket,
        safetyEnv: SAFETY_ENV(),
        safeFetchImpl: makeStubFetch({
          [`https://acme.test/asset-${expectExt}`]: {
            status: 200,
            contentType,
            body: new Uint8Array([0, 1, 2, 3]),
          },
        }),
      });
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.r2Key.endsWith(`.${expectExt}`)).toBe(true);
    }
  });

  it("falls back to .bin when the response has no Content-Type", async () => {
    const result = await mirrorAssetToR2({
      url: "https://acme.test/unknown",
      siteId: "site-1",
      bucket: makeMemR2(),
      safetyEnv: SAFETY_ENV(),
      safeFetchImpl: makeStubFetch({
        "https://acme.test/unknown": { status: 200, body: new Uint8Array([0]) },
      }),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.r2Key.endsWith(".bin")).toBe(true);
    }
  });

  it("AC8: surfaces body_too_large from safeFetch as failure with the same reason", async () => {
    const result = await mirrorAssetToR2({
      url: "https://acme.test/giant.png",
      siteId: "site-1",
      bucket: makeMemR2(),
      safetyEnv: SAFETY_ENV(),
      safeFetchImpl: makeStubFailingFetch({
        "https://acme.test/giant.png": { reason: "body_too_large" },
      }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("body_too_large");
    }
  });

  it("surfaces 4xx/5xx as non_2xx without writing to R2", async () => {
    const bucket = makeMemR2();
    const result = await mirrorAssetToR2({
      url: "https://acme.test/missing.png",
      siteId: "site-1",
      bucket,
      safetyEnv: SAFETY_ENV(),
      safeFetchImpl: makeStubFetch({
        "https://acme.test/missing.png": {
          status: 404,
          contentType: "text/html",
          body: new TextEncoder().encode("not found"),
        },
      }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("non_2xx");
      expect(result.detail).toMatch(/status 404/);
    }
    // R2 should NOT have been written.
    const list = await bucket.list();
    expect(list.objects.length).toBe(0);
  });

  it("rejects non-http(s) URLs as unsupported_scheme without calling safeFetch", async () => {
    let called = false;
    const safeFetchImpl: SafeFetchFn = (async () => {
      called = true;
      return { ok: false as const, reason: "network_error" as const };
    }) as unknown as SafeFetchFn;

    const result = await mirrorAssetToR2({
      url: "data:image/png;base64,iVBORw==",
      siteId: "site-1",
      bucket: makeMemR2(),
      safetyEnv: SAFETY_ENV(),
      safeFetchImpl,
    });
    expect(called).toBe(false);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unsupported_scheme");
  });

  it("maps SSRF rejections (private_ip, etc.) to ssrf_blocked", async () => {
    const result = await mirrorAssetToR2({
      url: "http://example.com/x.png",
      siteId: "site-1",
      bucket: makeMemR2(),
      safetyEnv: SAFETY_ENV(),
      safeFetchImpl: makeStubFailingFetch({
        "http://example.com/x.png": { reason: "private_ip" },
      }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("ssrf_blocked");
  });

  it("urlContentHash + r2KeyFor are deterministic for the same URL", async () => {
    const a = await urlContentHash("https://acme.test/hero.jpg");
    const b = await urlContentHash("https://acme.test/hero.jpg");
    expect(a).toBe(b);
    const k1 = await r2KeyFor({ url: "https://acme.test/hero.jpg", siteId: "x", extension: "jpg" });
    const k2 = await r2KeyFor({ url: "https://acme.test/hero.jpg", siteId: "x", extension: "jpg" });
    expect(k1).toBe(k2);
  });
});

describe("UAT FC REQ-28: mirrorAssetBatchToR2 (Stage 4 batch)", () => {
  it("AC7: dedupes identical URLs in the input so safeFetch is called once per unique URL", async () => {
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

    const bucket = makeMemR2();
    const result = await mirrorAssetBatchToR2({
      urls: [
        "https://acme.test/hero.jpg",
        "https://acme.test/hero.jpg",
        "https://acme.test/other.jpg",
        "https://acme.test/hero.jpg",
      ],
      siteId: "site-1",
      bucket,
      safetyEnv: SAFETY_ENV(),
      safeFetchImpl,
    });
    expect(calls).toBe(2);
    expect(result.successes.length).toBe(2);
    expect(result.urlToR2Key.get("https://acme.test/hero.jpg")).toBeDefined();
    expect(result.urlToR2Key.get("https://acme.test/other.jpg")).toBeDefined();
    expect(result.urlToR2Key.size).toBe(2);

    // Two distinct R2 keys.
    expect(result.urlToR2Key.get("https://acme.test/hero.jpg")).not.toBe(
      result.urlToR2Key.get("https://acme.test/other.jpg"),
    );
  });

  it("AC8: collects per-failure reasons separately so the orchestrator can render the gap surface", async () => {
    const safeFetchImpl: SafeFetchFn = (async (url: string) => {
      if (url.includes("giant")) {
        return { ok: false as const, reason: "body_too_large" as const };
      }
      if (url.includes("blocked")) {
        return { ok: false as const, reason: "requires_robots_override" as const };
      }
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

    const events: Array<{ ok: boolean; reason?: string }> = [];
    const result = await mirrorAssetBatchToR2({
      urls: [
        "https://acme.test/ok.png",
        "https://acme.test/giant.png",
        "https://acme.test/blocked.png",
      ],
      siteId: "site-1",
      bucket: makeMemR2(),
      safetyEnv: SAFETY_ENV(),
      safeFetchImpl,
      onResult: (r) => {
        events.push({ ok: r.ok, reason: r.ok ? undefined : r.reason });
      },
    });
    expect(result.successes.length).toBe(1);
    expect(result.failures.length).toBe(2);
    const reasons = result.failures.map((f) => f.reason).sort();
    expect(reasons).toEqual(["body_too_large", "requires_robots_override"]);
    expect(events.length).toBe(3);
  });
});

describe("UAT FC REQ-28: classifyContentType", () => {
  it("returns extension + canonical content-type for known image and video types", () => {
    expect(classifyContentType("image/png").extension).toBe("png");
    expect(classifyContentType("image/jpeg").extension).toBe("jpg");
    expect(classifyContentType("image/webp").extension).toBe("webp");
    expect(classifyContentType("image/svg+xml").extension).toBe("svg");
    expect(classifyContentType("video/mp4").extension).toBe("mp4");
  });

  it("strips charset/params from the content-type header", () => {
    expect(classifyContentType("image/png; charset=binary").extension).toBe("png");
  });

  it("falls back to bin for null and unknown content-types", () => {
    expect(classifyContentType(null).extension).toBe("bin");
    expect(classifyContentType("application/octet-stream").extension).toBe("bin");
  });
});
