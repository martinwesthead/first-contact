import { describe, expect, it } from "vitest";
import {
  chargeBrowserBudget,
  checkBrowserBudget,
  DEFAULT_BROWSER_BUDGET,
} from "../packages/web-fetch-safety/src/index.js";
import { makeMemKv } from "./_helpers_REQ-20_kv.js";

// BUG-17: the per-session/per-day defaults were 50s/200s and blocked
// testing because a single dev session would accumulate seconds across
// many operator calls and trip the cap. The fix raises both defaults to
// 1e9 seconds (≈ 31.7 years) so the cap never fires for production
// callers; per-call config overrides still let a caller opt into a tight
// ceiling (exercised by the updated REQ-20 test).
describe("UAT FC BUG-17: browser-rendering budget defaults are effectively infinite", () => {
  it("defaults expose ≥ 1e9 seconds for both session and day windows", () => {
    expect(DEFAULT_BROWSER_BUDGET.sessionMaxSeconds).toBeGreaterThanOrEqual(
      1_000_000_000,
    );
    expect(DEFAULT_BROWSER_BUDGET.dayMaxSeconds).toBeGreaterThanOrEqual(
      1_000_000_000,
    );
  });

  it("a large 100_000s charge against a fresh session with no override is accepted", async () => {
    const env = { BROWSER_BUDGET_KV: makeMemKv() };
    const clock = () => 1_700_000_000_000;
    const d = await chargeBrowserBudget(env, {
      accountId: "acct-bug17",
      sessionId: "sess-bug17",
      costSeconds: 100_000,
      clock,
    });
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.remaining.session).toBeGreaterThan(0);
    expect(d.remaining.day).toBeGreaterThan(0);
  });

  it("a probe (checkBrowserBudget) after 100_000s of charges still reports ok", async () => {
    const env = { BROWSER_BUDGET_KV: makeMemKv() };
    const clock = () => 1_700_000_000_000;
    // Burn 100 charges of 1_000s each = 100_000s total against the same session.
    for (let i = 0; i < 100; i++) {
      const charge = await chargeBrowserBudget(env, {
        accountId: "acct-bug17b",
        sessionId: "sess-bug17b",
        costSeconds: 1_000,
        clock,
      });
      expect(charge.ok).toBe(true);
    }
    const probe = await checkBrowserBudget(env, {
      accountId: "acct-bug17b",
      sessionId: "sess-bug17b",
      clock,
    });
    expect(probe.ok).toBe(true);
  });
});
