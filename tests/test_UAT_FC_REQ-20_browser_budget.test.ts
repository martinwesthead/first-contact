import { describe, expect, it } from "vitest";
import {
  chargeBrowserBudget,
  DEFAULT_BROWSER_BUDGET,
} from "../packages/web-fetch-safety/src/index.js";
import { makeMemKv } from "./_helpers_REQ-20_kv.js";

describe("UAT FC REQ-20: browser-rendering budget (AC 9)", () => {
  // BUG-17: defaults are now effectively infinite. The cap mechanism still
  // works when callers pass an explicit `config` override — this test
  // exercises that path with a tight 50s/200s ceiling.
  it("AC9: with an explicit 50s session cap, the 51st request is budget_exhausted", async () => {
    const env = { BROWSER_BUDGET_KV: makeMemKv() };
    const clock = () => 1_700_000_000_000;
    const config = { sessionMaxSeconds: 50, dayMaxSeconds: 200 };
    // Spend the full session budget across 10 charges of 5s each.
    for (let i = 0; i < 10; i++) {
      const d = await chargeBrowserBudget(env, {
        accountId: "acct-9",
        sessionId: "sess-9",
        costSeconds: 5,
        clock,
        config,
      });
      expect(d.ok).toBe(true);
    }
    // Next charge attempt fails on the session window.
    const d = await chargeBrowserBudget(env, {
      accountId: "acct-9",
      sessionId: "sess-9",
      costSeconds: 1,
      clock,
      config,
    });
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.reason).toBe("budget_exhausted");
    expect(d.exhausted).toBe("session");
    expect(d.remainingSeconds).toBe(0);
    expect(DEFAULT_BROWSER_BUDGET.sessionMaxSeconds).toBeGreaterThanOrEqual(1_000_000_000);
  });
});
