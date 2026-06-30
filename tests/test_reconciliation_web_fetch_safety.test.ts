import { describe, expect, it } from "vitest";
import worker from "../apps/control-app/src/index.js";
import {
  validateTarget,
  classifyHost,
  safeFetch,
  RobotsTxtCache,
  checkRateLimit,
  chargeBrowserBudget,
  checkBrowserBudget,
  mintIntentToken,
  verifyIntentToken,
  operatorMessageImpliesIntent,
  INTENT_TOKEN_TTL_SECONDS,
  MAX_BODY_BYTES,
  MAX_REDIRECTS,
  DEFAULT_RATE_LIMITS,
  DEFAULT_BROWSER_BUDGET,
} from "../packages/web-fetch-safety/src/index.js";
import { makeMemKv } from "./_helpers_REQ-20_kv.js";

describe("Story story-a0482aed: External fetch safety contract", () => {
  // ─────────────────────────────────────────────────────────────────────
  // AC-555: SSRF host blocklist across IPv4 and IPv6.
  // ─────────────────────────────────────────────────────────────────────
  it("test_UAT_AC555_internal_and_ssrf_targets_rejected_with_typed_detail", () => {
    const cases: Array<{ url: string; detail: string }> = [
      // IPv4 — each major SSRF class.
      { url: "https://127.0.0.1/x", detail: "loopback" },
      { url: "https://10.0.0.1/x", detail: "private_ip" },
      { url: "https://172.16.0.1/x", detail: "private_ip" },
      { url: "https://192.168.0.1/x", detail: "private_ip" },
      { url: "https://169.254.0.1/x", detail: "link_local" },
      { url: "https://169.254.169.254/x", detail: "metadata_host" },
      { url: "https://0.0.0.0/x", detail: "unspecified" },
      { url: "https://255.255.255.255/x", detail: "broadcast" },
      // IPv6 — loopback, link-local, ULA private.
      { url: "https://[::1]/x", detail: "loopback" },
      { url: "https://[fe80::1]/x", detail: "link_local" },
      { url: "https://[fc00::1]/x", detail: "private_ip" },
      // Well-known SSRF hostnames.
      { url: "https://localhost/x", detail: "loopback" },
      { url: "https://metadata.google.internal/x", detail: "metadata_host" },
      { url: "https://metadata.aws.internal/x", detail: "metadata_host" },
      { url: "https://metadata.azure.internal/x", detail: "metadata_host" },
    ];

    for (const { url, detail } of cases) {
      const out = validateTarget(url);
      expect(out.ok, `expected reject: ${url}`).toBe(false);
      if (out.ok) continue;
      expect(out.reason, `reason for ${url}`).toBe("private_ip");
      expect(out.detail, `detail for ${url}`).toBe(detail);
    }

    // classifyHost is the exposed validation surface for raw hosts.
    expect(classifyHost("127.0.0.1")).toBe("loopback");
    expect(classifyHost("192.0.2.1")).toBeNull(); // public TEST-NET → null
  });

  // ─────────────────────────────────────────────────────────────────────
  // AC-556: Disallowed schemes carry the offending scheme in the detail.
  // ─────────────────────────────────────────────────────────────────────
  it("test_UAT_AC556_disallowed_schemes_rejected_with_typed_reason", async () => {
    const cases = [
      "file:///etc/passwd",
      "gopher://example.com/_x",
      "data:text/plain,hello",
      "ftp://example.com/x",
    ];
    let upstreamCalls = 0;
    const fetchImpl = async (): Promise<Response> => {
      upstreamCalls += 1;
      return new Response("should never reach here", { status: 200 });
    };
    const env = { FETCH_CACHE_KV: makeMemKv(), FETCH_ROBOTS_KV: makeMemKv() };

    for (const url of cases) {
      const check = validateTarget(url);
      expect(check.ok, `expected reject: ${url}`).toBe(false);
      if (check.ok) continue;
      expect(check.reason).toBe("disallowed_scheme");
      // Detail must identify the offending scheme — implementation
      // returns the URL.protocol (e.g. "file:").
      const proto = new URL(url).protocol;
      expect(check.detail).toBe(proto);

      // safeFetch must NOT issue any outbound request for these.
      const res = await safeFetch(url, env, { fetchImpl, cacheEnabled: false });
      expect(res.ok).toBe(false);
      if (res.ok) continue;
      expect(res.reason).toBe("disallowed_scheme");
    }
    expect(upstreamCalls).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────────
  // AC-557: Plain HTTP allowed only when explicitly approved for the
  // same HTTPS-equivalent origin within the same call.
  // ─────────────────────────────────────────────────────────────────────
  it("test_UAT_AC557_plain_http_requires_same_origin_approval", () => {
    // (a) No approval → rejected as http_not_allowed.
    const r1 = validateTarget("http://example.com/x");
    expect(r1.ok).toBe(false);
    if (!r1.ok) {
      expect(r1.reason).toBe("disallowed_scheme");
      expect(r1.detail).toBe("http_not_allowed");
    }

    // (b) Approval for the matching HTTPS origin → allowed.
    const r2 = validateTarget("http://example.com/x", {
      allowHttpForOrigin: "https://example.com",
    });
    expect(r2.ok).toBe(true);

    // (c) Approval for a DIFFERENT origin → rejected as origin mismatch.
    const r3 = validateTarget("http://other.com/x", {
      allowHttpForOrigin: "https://example.com",
    });
    expect(r3.ok).toBe(false);
    if (!r3.ok) {
      expect(r3.reason).toBe("disallowed_scheme");
      expect(r3.detail).toBe("http_origin_mismatch");
    }
  });

  // ─────────────────────────────────────────────────────────────────────
  // AC-558: Redirects re-validate against the FULL SSRF/scheme contract,
  // and same-origin http allowance does NOT carry across hops.
  // ─────────────────────────────────────────────────────────────────────
  it("test_UAT_AC558_redirects_revalidate_target_on_every_hop", async () => {
    const fetched: string[] = [];
    const fetchImpl = async (input: any): Promise<Response> => {
      const u = typeof input === "string" ? input : input.url;
      fetched.push(u);
      if (u === "https://example.com/x") {
        return new Response(null, {
          status: 301,
          headers: { location: "http://127.0.0.1/x" },
        });
      }
      return new Response("should never reach here", { status: 200 });
    };
    const env = { FETCH_CACHE_KV: makeMemKv(), FETCH_ROBOTS_KV: makeMemKv() };
    const res = await safeFetch("https://example.com/x", env, {
      fetchImpl,
      cacheEnabled: false,
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("private_ip");
    expect(res.detail).toBe("loopback");
    // The loopback URL must NEVER have been issued upstream.
    expect(fetched).not.toContain("http://127.0.0.1/x");
    expect(fetched).toEqual(["https://example.com/x"]);
  });

  // ─────────────────────────────────────────────────────────────────────
  // AC-559: Redirect chain is capped at 5 hops.
  // ─────────────────────────────────────────────────────────────────────
  it("test_UAT_AC559_redirect_chain_capped_at_five_hops", async () => {
    const env = () => ({ FETCH_CACHE_KV: makeMemKv(), FETCH_ROBOTS_KV: makeMemKv() });
    const fiveThenOk = async (input: any): Promise<Response> => {
      const u = new URL(typeof input === "string" ? input : input.url);
      const n = Number(u.searchParams.get("n") ?? "0");
      // After 5 redirect responses, return a 200.
      if (n >= MAX_REDIRECTS) return new Response("done", { status: 200 });
      const next = new URL(u);
      next.searchParams.set("n", String(n + 1));
      return new Response(null, {
        status: 301,
        headers: { location: next.toString() },
      });
    };
    const ok = await safeFetch("https://example.com/r?n=0", env(), {
      fetchImpl: fiveThenOk,
      cacheEnabled: false,
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.redirects).toBe(MAX_REDIRECTS);
      expect(ok.status).toBe(200);
    }

    // 6th redirect → too_many_redirects.
    const sixHops = async (input: any): Promise<Response> => {
      const u = new URL(typeof input === "string" ? input : input.url);
      const n = Number(u.searchParams.get("n") ?? "0");
      if (n >= MAX_REDIRECTS + 1) return new Response("done", { status: 200 });
      const next = new URL(u);
      next.searchParams.set("n", String(n + 1));
      return new Response(null, {
        status: 302,
        headers: { location: next.toString() },
      });
    };
    const tooMany = await safeFetch("https://example.com/r?n=0", env(), {
      fetchImpl: sixHops,
      cacheEnabled: false,
    });
    expect(tooMany.ok).toBe(false);
    if (!tooMany.ok) expect(tooMany.reason).toBe("too_many_redirects");
  });

  // ─────────────────────────────────────────────────────────────────────
  // AC-560: Response body capped at 5 MB with no partial body returned.
  // ─────────────────────────────────────────────────────────────────────
  it("test_UAT_AC560_response_body_capped_at_five_megabytes", async () => {
    const env = () => ({ FETCH_CACHE_KV: makeMemKv(), FETCH_ROBOTS_KV: makeMemKv() });

    // (a) Over the cap: 10 MB streamed → body_too_large, stream cancelled.
    let oversizeCancelled = false;
    const tenMb = 10 * 1024 * 1024;
    const oversize = async (): Promise<Response> => {
      const chunk = new Uint8Array(64 * 1024).fill(0x41);
      let remaining = tenMb;
      const stream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          if (remaining <= 0) {
            controller.close();
            return;
          }
          const next =
            remaining >= chunk.byteLength ? chunk : chunk.slice(0, remaining);
          remaining -= next.byteLength;
          controller.enqueue(next);
        },
        cancel() {
          oversizeCancelled = true;
        },
      });
      return new Response(stream, { status: 200 });
    };
    const tooBig = await safeFetch("https://example.com/big", env(), {
      fetchImpl: oversize,
      cacheEnabled: false,
    });
    expect(tooBig.ok).toBe(false);
    if (!tooBig.ok) {
      expect(tooBig.reason).toBe("body_too_large");
      // No body field on failure → success-only.
      expect((tooBig as { body?: unknown }).body).toBeUndefined();
    }
    expect(oversizeCancelled).toBe(true);
    expect(MAX_BODY_BYTES).toBe(5 * 1024 * 1024);

    // (b) Under the cap: 4 MB → success with full body.
    const fourMb = 4 * 1024 * 1024;
    const okSize = async (): Promise<Response> => {
      const body = new Uint8Array(fourMb).fill(0x42);
      return new Response(body, { status: 200 });
    };
    const fits = await safeFetch("https://example.com/ok", env(), {
      fetchImpl: okSize,
      cacheEnabled: false,
    });
    expect(fits.ok).toBe(true);
    if (fits.ok) expect(fits.body.byteLength).toBe(fourMb);
  });

  // ─────────────────────────────────────────────────────────────────────
  // AC-561: Identical GET fetches within 1 hour return from cache.
  // Non-GET bypasses cache; different range = different key.
  // ─────────────────────────────────────────────────────────────────────
  it("test_UAT_AC561_identical_get_fetches_within_one_hour_return_from_cache", async () => {
    const env = { FETCH_CACHE_KV: makeMemKv(), FETCH_ROBOTS_KV: makeMemKv() };
    let upstreamCalls = 0;
    const fetchImpl = async (input: any, init?: RequestInit): Promise<Response> => {
      upstreamCalls += 1;
      const u = typeof input === "string" ? input : input.url;
      // Echo the range header so we can confirm distinct upstream calls.
      const range =
        (init?.headers as Record<string, string> | undefined)?.range ?? "full";
      return new Response(`${u}|${range}`, {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    };

    // First GET: MISS.
    const first = await safeFetch("https://example.com/page", env, { fetchImpl });
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.cacheStatus).toBe("MISS");
      expect(first.headers.get("x-fetch-cache")).toBe("MISS");
    }

    // Second GET (identical): HIT, no new upstream call.
    const second = await safeFetch("https://example.com/page", env, { fetchImpl });
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.cacheStatus).toBe("HIT");
      expect(second.headers.get("x-fetch-cache")).toBe("HIT");
    }
    expect(upstreamCalls).toBe(1);

    // Third call with a different range → distinct cache key → fresh MISS.
    const ranged = await safeFetch("https://example.com/page", env, {
      fetchImpl,
      range: "bytes=0-1023",
    });
    expect(ranged.ok).toBe(true);
    if (ranged.ok) expect(ranged.cacheStatus).toBe("MISS");
    expect(upstreamCalls).toBe(2);
  });

  // ─────────────────────────────────────────────────────────────────────
  // AC-562: Per-account hourly fetch limit.
  // ─────────────────────────────────────────────────────────────────────
  it("test_UAT_AC562_per_account_hourly_fetch_limit_rate_limited_on_overage", async () => {
    const env = { FETCH_RATE_KV: makeMemKv() };
    let t = 1_700_000_000_000;
    const clock = () => t;
    // Spread checks across the burst window so the burst counter never trips.
    for (let i = 0; i < DEFAULT_RATE_LIMITS.hourMax; i++) {
      const d = await checkRateLimit(env, "acct-562", {
        clock,
        config: { burstWindowSeconds: 1 },
      });
      expect(d.ok).toBe(true);
      t += 2_000; // 2s between calls
    }
    const d21 = await checkRateLimit(env, "acct-562", {
      clock,
      config: { burstWindowSeconds: 1 },
    });
    expect(d21.ok).toBe(false);
    if (d21.ok) return;
    expect(d21.reason).toBe("rate_limited");
    expect(d21.window).toBe("hour");
    expect(d21.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(d21.retryAfterSeconds).toBeLessThanOrEqual(3600);
  });

  // ─────────────────────────────────────────────────────────────────────
  // AC-563: Per-account burst limit (10 in 60s).
  // ─────────────────────────────────────────────────────────────────────
  it("test_UAT_AC563_per_account_burst_limit_rate_limited_at_eleven_in_sixty_seconds", async () => {
    const env = { FETCH_RATE_KV: makeMemKv() };
    const clock = () => 1_700_000_500_000;
    for (let i = 0; i < DEFAULT_RATE_LIMITS.burstMax; i++) {
      const d = await checkRateLimit(env, "acct-563", { clock });
      expect(d.ok).toBe(true);
    }
    const d11 = await checkRateLimit(env, "acct-563", { clock });
    expect(d11.ok).toBe(false);
    if (d11.ok) return;
    expect(d11.reason).toBe("rate_limited");
    expect(d11.window).toBe("burst");
    expect(d11.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(d11.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  // ─────────────────────────────────────────────────────────────────────
  // AC-564: Per-account daily fetch limit (100/day).
  // ─────────────────────────────────────────────────────────────────────
  it("test_UAT_AC564_per_account_daily_fetch_limit_rate_limited_on_overage", async () => {
    const env = { FETCH_RATE_KV: makeMemKv() };
    let t = 1_700_000_000_000;
    const clock = () => t;
    // Override hourly/burst limits so we can exercise the daily window
    // without those windows interfering.
    const config = {
      hourMax: 10_000,
      burstMax: 10_000,
      burstWindowSeconds: 1,
    } as const;
    for (let i = 0; i < DEFAULT_RATE_LIMITS.dayMax; i++) {
      const d = await checkRateLimit(env, "acct-564", { clock, config });
      expect(d.ok).toBe(true);
      t += 2_000;
    }
    const d101 = await checkRateLimit(env, "acct-564", { clock, config });
    expect(d101.ok).toBe(false);
    if (d101.ok) return;
    expect(d101.reason).toBe("rate_limited");
    expect(d101.window).toBe("day");
    expect(d101.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(d101.retryAfterSeconds).toBeLessThanOrEqual(86400);
  });

  // ─────────────────────────────────────────────────────────────────────
  // AC-565 (BUG-17): per-chat-session browser budget is infinite by default;
  // a finite session cap is enforced only under an explicit config override.
  // ─────────────────────────────────────────────────────────────────────
  it("test_UAT_AC565_session_budget_infinite_by_default_finite_only_under_config_override", async () => {
    const clock = () => 1_700_000_000_000;

    // Default path: NO config override → the session budget is effectively
    // infinite. Charge a cumulative total far above the old 50s ceiling to a
    // single session; every check returns ok.
    const envDefault = { BROWSER_BUDGET_KV: makeMemKv() };
    for (let i = 0; i < 20; i++) {
      const d = await chargeBrowserBudget(envDefault, {
        accountId: "acct-565",
        sessionId: "sess-565",
        costSeconds: 1_000, // 20 × 1000 = 20_000s, 400× the old 50s cap
        clock,
      });
      expect(d.ok).toBe(true);
    }
    expect(DEFAULT_BROWSER_BUDGET.sessionMaxSeconds).toBe(1_000_000_000);

    // Override path: an explicit small sessionMaxSeconds re-arms the cap.
    const envOverride = { BROWSER_BUDGET_KV: makeMemKv() };
    const config = { sessionMaxSeconds: 50 };
    for (let i = 0; i < 10; i++) {
      const d = await chargeBrowserBudget(envOverride, {
        accountId: "acct-565b",
        sessionId: "sess-565b",
        costSeconds: 5,
        clock,
        config,
      });
      expect(d.ok).toBe(true);
    }
    // Counter has reached the 50s cap (inclusive: spent >= cap exhausts).
    const exhausted = await checkBrowserBudget(envOverride, {
      accountId: "acct-565b",
      sessionId: "sess-565b",
      clock,
      config,
    });
    expect(exhausted.ok).toBe(false);
    if (exhausted.ok) return;
    expect(exhausted.reason).toBe("budget_exhausted");
    expect(exhausted.exhausted).toBe("session");
    expect(exhausted.remainingSeconds).toBe(0);

    // A different session for the same account still has its own budget under
    // the same override.
    const otherSession = await checkBrowserBudget(envOverride, {
      accountId: "acct-565b",
      sessionId: "sess-565b-other",
      clock,
      config,
    });
    expect(otherSession.ok).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────
  // AC-566 (BUG-17): per-account-day browser budget is infinite by default;
  // a finite day cap is enforced only under an explicit config override and
  // resets at the next UTC day boundary.
  // ─────────────────────────────────────────────────────────────────────
  it("test_UAT_AC566_account_day_budget_infinite_by_default_finite_only_under_config_override", async () => {
    const clock = () => 1_700_000_000_000;

    // Default path: NO config override → large cumulative day total across
    // many distinct sessions for one account is always accepted.
    const envDefault = { BROWSER_BUDGET_KV: makeMemKv() };
    for (let i = 0; i < 10; i++) {
      const d = await chargeBrowserBudget(envDefault, {
        accountId: "acct-566",
        sessionId: `sess-566-${i}`,
        costSeconds: 1_000, // 10_000s total, 50× the old 200s ceiling
        clock,
      });
      expect(d.ok).toBe(true);
    }
    expect(DEFAULT_BROWSER_BUDGET.dayMaxSeconds).toBe(1_000_000_000);

    // Override path: an explicit small dayMaxSeconds re-arms the per-account
    // day cap. Charge 200s across 5 sessions (40s each, under the infinite
    // session window) so the day counter hits the override before any session.
    let t = 1_700_000_000_000; // arbitrary UTC instant
    const movingClock = () => t;
    const envOverride = { BROWSER_BUDGET_KV: makeMemKv() };
    const config = { dayMaxSeconds: 200 };
    for (let i = 0; i < 5; i++) {
      const d = await chargeBrowserBudget(envOverride, {
        accountId: "acct-566b",
        sessionId: `sess-566b-${i}`,
        costSeconds: 40,
        clock: movingClock,
        config,
      });
      expect(d.ok).toBe(true);
    }

    // A fresh 6th session attempts ANY charge → account-day budget exhausted.
    const exhausted = await checkBrowserBudget(envOverride, {
      accountId: "acct-566b",
      sessionId: "sess-566b-6",
      clock: movingClock,
      config,
    });
    expect(exhausted.ok).toBe(false);
    if (exhausted.ok) return;
    expect(exhausted.reason).toBe("budget_exhausted");
    expect(exhausted.exhausted).toBe("day");
    expect(exhausted.remainingSeconds).toBe(0);

    // Advance the clock past the next UTC day boundary; full day budget back.
    const ONE_DAY_MS = 86_400_000;
    t += ONE_DAY_MS + 5_000;
    (envOverride.BROWSER_BUDGET_KV as ReturnType<typeof makeMemKv>).__advance(
      ONE_DAY_MS + 5_000,
    );
    const fresh = await checkBrowserBudget(envOverride, {
      accountId: "acct-566b",
      sessionId: "sess-566b-fresh",
      clock: movingClock,
      config,
    });
    expect(fresh.ok).toBe(true);
    if (fresh.ok) expect(fresh.remaining.day).toBe(200);
  });

  // ─────────────────────────────────────────────────────────────────────
  // AC-839 (BUG-17): under default configuration the browser budget accepts
  // an arbitrarily large browser-second charge — the cap never fires.
  // ─────────────────────────────────────────────────────────────────────
  it("test_UAT_AC839_default_budget_accepts_arbitrarily_large_charges", async () => {
    const env = { BROWSER_BUDGET_KV: makeMemKv() };
    const clock = () => 1_700_000_000_000;

    // A single very large charge against a fresh session, no override → ok.
    const big = await chargeBrowserBudget(env, {
      accountId: "acct-839",
      sessionId: "sess-839",
      costSeconds: 100_000,
      clock,
    });
    expect(big.ok).toBe(true);

    // Repeating many large charges within the same session/account-day never
    // trips the cap (100 × 1000s = 100_000s more).
    for (let i = 0; i < 100; i++) {
      const d = await chargeBrowserBudget(env, {
        accountId: "acct-839",
        sessionId: "sess-839",
        costSeconds: 1_000,
        clock,
      });
      expect(d.ok).toBe(true);
    }
    const probe = await checkBrowserBudget(env, {
      accountId: "acct-839",
      sessionId: "sess-839",
      clock,
    });
    expect(probe.ok).toBe(true);

    // The default ceilings are each effectively infinite.
    expect(DEFAULT_BROWSER_BUDGET.sessionMaxSeconds).toBeGreaterThanOrEqual(
      1_000_000_000,
    );
    expect(DEFAULT_BROWSER_BUDGET.dayMaxSeconds).toBeGreaterThanOrEqual(
      1_000_000_000,
    );
  });

  // ─────────────────────────────────────────────────────────────────────
  // AC-567: robots.txt longest-match precedence, 24h cache.
  // ─────────────────────────────────────────────────────────────────────
  it("test_UAT_AC567_robots_txt_rules_govern_with_longest_match_precedence", async () => {
    const env = { FETCH_ROBOTS_KV: makeMemKv() };
    let robotsFetches = 0;
    const fetchImpl = async (input: any): Promise<Response> => {
      const u = typeof input === "string" ? input : input.url;
      if (u.endsWith("/robots.txt")) {
        robotsFetches += 1;
        return new Response(
          [
            "User-agent: *",
            "Disallow: /private/",
            "Allow: /private/public-info",
            "",
          ].join("\n"),
          { status: 200 },
        );
      }
      return new Response("not found", { status: 404 });
    };
    const cache = new RobotsTxtCache(env, { fetchImpl });

    // Disallowed: shorter rule applies.
    const secret = await cache.check("https://example.com/private/secret");
    expect(secret.allowed).toBe(false);
    if (!secret.allowed) expect(secret.origin).toBe("example.com");

    // Longer-match allow wins over shorter disallow.
    const publicInfo = await cache.check(
      "https://example.com/private/public-info",
    );
    expect(publicInfo.allowed).toBe(true);

    // Outside any rule → default allow.
    const about = await cache.check("https://example.com/about");
    expect(about.allowed).toBe(true);

    // After the first lookup, subsequent checks for the same origin
    // do not issue another robots.txt fetch (24h cache).
    expect(robotsFetches).toBe(1);

    // Missing robots.txt → treat as allow-all.
    const env2 = { FETCH_ROBOTS_KV: makeMemKv() };
    const missing = async (): Promise<Response> =>
      new Response("nope", { status: 404 });
    const cache2 = new RobotsTxtCache(env2, { fetchImpl: missing });
    const allowAll = await cache2.check("https://other.com/anywhere");
    expect(allowAll.allowed).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────
  // AC-568: Per-chat robots override.
  // ─────────────────────────────────────────────────────────────────────
  it("test_UAT_AC568_per_chat_robots_override_unblocks_origin_without_affecting_other_chats", async () => {
    const env = { FETCH_ROBOTS_KV: makeMemKv() };
    const fetchImpl = async (input: any): Promise<Response> => {
      const u = typeof input === "string" ? input : input.url;
      if (u.endsWith("/robots.txt")) {
        return new Response("User-agent: *\nDisallow: /\n", { status: 200 });
      }
      return new Response("not found", { status: 404 });
    };
    const cache = new RobotsTxtCache(env, { fetchImpl });

    // Without override: blocked.
    const blocked = await cache.check("https://example.com/x");
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.origin).toBe("example.com");

    // Same URL WITH override list naming the origin → allowed.
    const allowed = await cache.check("https://example.com/x", {
      overrides: ["example.com"],
    });
    expect(allowed.allowed).toBe(true);

    // A sibling chat (no override list) on the same cache: still blocked.
    const siblingChat = await cache.check("https://example.com/x");
    expect(siblingChat.allowed).toBe(false);
    if (!siblingChat.allowed) expect(siblingChat.origin).toBe("example.com");
  });

  // ─────────────────────────────────────────────────────────────────────
  // AC-569: Operator-intent token is required for AI-initiated fetch.
  // ─────────────────────────────────────────────────────────────────────
  it("test_UAT_AC569_operator_intent_token_required_for_ai_fetch_tool_call", async () => {
    const env = { FETCH_RATE_KV: makeMemKv() };

    // (a) No token → missing_intent + no_token.
    const noToken = await verifyIntentToken(env, {
      token: null,
      sessionId: "sess-A",
    });
    expect(noToken.ok).toBe(false);
    if (!noToken.ok) {
      expect(noToken.reason).toBe("missing_intent");
      expect(noToken.detail).toBe("no_token");
    }

    // (b) Arbitrary token never minted → missing_intent + expired.
    const fake = await verifyIntentToken(env, {
      token: "deadbeef-never-minted",
      sessionId: "sess-A",
    });
    expect(fake.ok).toBe(false);
    if (!fake.ok) {
      expect(fake.reason).toBe("missing_intent");
      expect(fake.detail).toBe("expired");
    }

    // (c) Mint + verify → ok and token is consumed (a second verify fails).
    const { token } = await mintIntentToken(env, {
      sessionId: "sess-A",
      accountId: "acct-A",
    });
    const first = await verifyIntentToken(env, { token, sessionId: "sess-A" });
    expect(first.ok).toBe(true);
    const reuse = await verifyIntentToken(env, { token, sessionId: "sess-A" });
    expect(reuse.ok).toBe(false);
    if (!reuse.ok) {
      expect(reuse.reason).toBe("missing_intent");
      expect(reuse.detail).toBe("expired");
    }
  });

  // ─────────────────────────────────────────────────────────────────────
  // AC-570: Operator-intent token expires after 60 seconds.
  // ─────────────────────────────────────────────────────────────────────
  it("test_UAT_AC570_operator_intent_token_expires_after_sixty_seconds", async () => {
    const env = { FETCH_RATE_KV: makeMemKv() };
    let t = 1_700_000_000_000;
    const clock = () => t;

    // Mint at t=0; verify at t=59 (within TTL, same session): ok.
    const mint1 = await mintIntentToken(env, {
      sessionId: "sess-B",
      accountId: "acct-B",
      clock,
    });
    t += 59_000;
    const inWindow = await verifyIntentToken(env, {
      token: mint1.token,
      sessionId: "sess-B",
      clock,
    });
    expect(inWindow.ok).toBe(true);

    // Re-mint, then jump past TTL and verify → expired, token removed.
    t = 1_700_000_000_000;
    const mint2 = await mintIntentToken(env, {
      sessionId: "sess-B",
      accountId: "acct-B",
      clock,
    });
    t += (INTENT_TOKEN_TTL_SECONDS + 5) * 1000;
    (env.FETCH_RATE_KV as ReturnType<typeof makeMemKv>).__advance(
      (INTENT_TOKEN_TTL_SECONDS + 5) * 1000,
    );
    const expired = await verifyIntentToken(env, {
      token: mint2.token,
      sessionId: "sess-B",
      clock,
    });
    expect(expired.ok).toBe(false);
    if (!expired.ok) {
      expect(expired.reason).toBe("missing_intent");
      expect(expired.detail).toBe("expired");
    }
    // Store no longer contains the expired token after the failed verify.
    const stillThere = await env.FETCH_RATE_KV.get(`intent:${mint2.token}`);
    expect(stillThere).toBeNull();

    expect(INTENT_TOKEN_TTL_SECONDS).toBe(60);
  });

  // ─────────────────────────────────────────────────────────────────────
  // AC-571: Operator-intent token is bound to its chat session.
  // ─────────────────────────────────────────────────────────────────────
  it("test_UAT_AC571_operator_intent_token_bound_to_its_chat_session", async () => {
    const env = { FETCH_RATE_KV: makeMemKv() };
    const { token } = await mintIntentToken(env, {
      sessionId: "sess-A",
      accountId: "acct-A",
    });

    // Wrong session → session_mismatch; token is NOT consumed.
    const wrong = await verifyIntentToken(env, { token, sessionId: "sess-B" });
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) {
      expect(wrong.reason).toBe("missing_intent");
      expect(wrong.detail).toBe("session_mismatch");
    }

    // Correct session → still verifies successfully (not consumed by the
    // previous mismatched verification).
    const right = await verifyIntentToken(env, { token, sessionId: "sess-A" });
    expect(right.ok).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────
  // AC-572: operatorMessageImpliesIntent predicate.
  // ─────────────────────────────────────────────────────────────────────
  it("test_UAT_AC572_operator_messages_with_url_or_fetch_keyword_imply_intent", () => {
    // URL triggers.
    expect(operatorMessageImpliesIntent("Have a look at https://example.com please")).toBe(true);
    expect(operatorMessageImpliesIntent("http://acme.test is the source")).toBe(true);

    // Keyword triggers (case-insensitive).
    expect(operatorMessageImpliesIntent("Can you grab the homepage for me")).toBe(true);
    expect(operatorMessageImpliesIntent("please DOWNLOAD the logo")).toBe(true);
    expect(operatorMessageImpliesIntent("scrape it for inspiration")).toBe(true);
    expect(operatorMessageImpliesIntent("COPY FROM that other site")).toBe(true);
    expect(operatorMessageImpliesIntent("take a screenshot of acme")).toBe(true);

    // No URL, no keyword → false.
    expect(operatorMessageImpliesIntent("Make the homepage blue")).toBe(false);
    expect(operatorMessageImpliesIntent("Change the hero text to Welcome")).toBe(false);

    // Empty string → false.
    expect(operatorMessageImpliesIntent("")).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────────
  // AC-573: Safety diagnostic endpoint returns the caller's rate-limit
  // window state.
  // ─────────────────────────────────────────────────────────────────────
  it("test_UAT_AC573_safety_health_endpoint_returns_calling_accounts_rate_limit_state", async () => {
    const env = { FETCH_RATE_KV: makeMemKv() };

    // (a) GET with no account header → 200, account_id "anonymous", all counts 0.
    const anonResponse = await worker.fetch(
      new Request("https://app.1stcontact.io/api/_safety/health", {
        method: "GET",
      }),
      env as never,
    );
    expect(anonResponse.status).toBe(200);
    const anonBody = (await anonResponse.json()) as {
      account_id: string;
      windows: {
        hour: { count: number; resets_at: number };
        day: { count: number; resets_at: number };
        burst: { count: number; resets_at: number };
      };
    };
    expect(anonBody.account_id).toBe("anonymous");
    expect(anonBody.windows.hour.count).toBe(0);
    expect(anonBody.windows.day.count).toBe(0);
    expect(anonBody.windows.burst.count).toBe(0);
    expect(typeof anonBody.windows.hour.resets_at).toBe("number");
    expect(typeof anonBody.windows.day.resets_at).toBe("number");
    expect(typeof anonBody.windows.burst.resets_at).toBe("number");

    // (b) After N rate-limit checks for acct-1, the endpoint reflects them.
    const N = 3;
    for (let i = 0; i < N; i++) {
      const d = await checkRateLimit(env, "acct-1");
      expect(d.ok).toBe(true);
    }
    const acctResponse = await worker.fetch(
      new Request("https://app.1stcontact.io/api/_safety/health", {
        method: "GET",
        headers: { "x-account-id": "acct-1" },
      }),
      env as never,
    );
    expect(acctResponse.status).toBe(200);
    const acctBody = (await acctResponse.json()) as {
      account_id: string;
      windows: {
        hour: { count: number };
        day: { count: number };
        burst: { count: number };
      };
    };
    expect(acctBody.account_id).toBe("acct-1");
    expect(acctBody.windows.hour.count).toBeGreaterThanOrEqual(N);
    expect(acctBody.windows.day.count).toBeGreaterThanOrEqual(N);

    // (c) Non-GET methods return 405 with a JSON error body.
    const postResponse = await worker.fetch(
      new Request("https://app.1stcontact.io/api/_safety/health", {
        method: "POST",
      }),
      env as never,
    );
    expect(postResponse.status).toBe(405);
    expect(postResponse.headers.get("content-type")).toContain("application/json");
    const postBody = (await postResponse.json()) as { error: string };
    expect(typeof postBody.error).toBe("string");
    expect(postBody.error.length).toBeGreaterThan(0);
  });
});
