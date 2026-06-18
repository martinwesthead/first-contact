import { describe, expect, it } from "vitest";
import { checkRateLimit, DEFAULT_RATE_LIMITS } from "../packages/web-fetch-safety/src/index.js";
import { makeMemKv } from "./_helpers_REQ-20_kv.js";

describe("UAT FC REQ-20: per-account rate limits (AC 7–8)", () => {
  it("AC7: 21 fetches in one hour → 21st rejected with 1<=retry<=3600s", async () => {
    const env = { FETCH_RATE_KV: makeMemKv() };
    // Spread requests across the burst window so the burst counter never trips.
    let t = 1_700_000_000_000;
    const clock = () => t;
    for (let i = 0; i < DEFAULT_RATE_LIMITS.hourMax; i++) {
      const d = await checkRateLimit(env, "acct-7", {
        clock,
        config: { burstWindowSeconds: 1 },
      });
      expect(d.ok).toBe(true);
      t += 2_000;
    }
    const d21 = await checkRateLimit(env, "acct-7", {
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

  it("AC8: 11 fetches in 60s → 11th rejected on the burst window", async () => {
    const env = { FETCH_RATE_KV: makeMemKv() };
    const clock = () => 1_700_000_500_000;
    for (let i = 0; i < DEFAULT_RATE_LIMITS.burstMax; i++) {
      const d = await checkRateLimit(env, "acct-8", { clock });
      expect(d.ok).toBe(true);
    }
    const d11 = await checkRateLimit(env, "acct-8", { clock });
    expect(d11.ok).toBe(false);
    if (d11.ok) return;
    expect(d11.window).toBe("burst");
    expect(d11.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(d11.retryAfterSeconds).toBeLessThanOrEqual(60);
  });
});
