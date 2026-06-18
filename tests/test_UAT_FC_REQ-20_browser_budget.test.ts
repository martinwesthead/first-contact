import { describe, expect, it } from "vitest";
import {
  chargeBrowserBudget,
  DEFAULT_BROWSER_BUDGET,
} from "../packages/web-fetch-safety/src/index.js";
import { makeMemKv } from "./_helpers_REQ-20_kv.js";

describe("UAT FC REQ-20: browser-rendering budget (AC 9)", () => {
  it("AC9: after 50 browser-seconds in a session, the 51st request is budget_exhausted", async () => {
    const env = { BROWSER_BUDGET_KV: makeMemKv() };
    const clock = () => 1_700_000_000_000;
    // Spend the full session budget across 10 charges of 5s each.
    for (let i = 0; i < 10; i++) {
      const d = await chargeBrowserBudget(env, {
        accountId: "acct-9",
        sessionId: "sess-9",
        costSeconds: 5,
        clock,
      });
      expect(d.ok).toBe(true);
    }
    // Next charge attempt fails on the session window.
    const d = await chargeBrowserBudget(env, {
      accountId: "acct-9",
      sessionId: "sess-9",
      costSeconds: 1,
      clock,
    });
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.reason).toBe("budget_exhausted");
    expect(d.exhausted).toBe("session");
    expect(d.remainingSeconds).toBe(0);
    expect(DEFAULT_BROWSER_BUDGET.sessionMaxSeconds).toBe(50);
  });
});
