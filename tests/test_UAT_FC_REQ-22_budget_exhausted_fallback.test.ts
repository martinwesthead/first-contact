import { describe, expect, it } from "vitest";
import { chargeBrowserBudget, DEFAULT_BROWSER_BUDGET } from "../packages/web-fetch-safety/src/index.js";
import {
  loadFixture,
  makeFakeDriver,
  makeHarness,
  TINY_PNG,
} from "./_helpers_REQ-22_rendered.js";

describe("UAT FC REQ-22: budget-exhausted falls back to static (AC 10)", () => {
  it("AC10: when the session browser budget is exhausted, analyze_page returns ok with fetchPath='static' and a whatsMissing entry citing the budget", async () => {
    const h = makeHarness({ sessionId: "sess-exh", accountId: "acct-exh" });

    // Burn the full session budget in advance.
    for (let i = 0; i < 10; i++) {
      await chargeBrowserBudget(
        { BROWSER_BUDGET_KV: h.env.BROWSER_BUDGET_KV },
        {
          accountId: "acct-exh",
          sessionId: "sess-exh",
          costSeconds: 5,
        },
      );
    }
    expect(DEFAULT_BROWSER_BUDGET.sessionMaxSeconds).toBe(50);

    // Force escalation — the static signals would have been sufficient
    // otherwise. We want to exercise the budget gate, not the heuristic.
    h.setHtmlBody(loadFixture("plain-html-site"));
    h.installDriver(
      makeFakeDriver({
        html: "<html><body><h1>Should not be reached</h1></body></html>",
        computedStyles: {
          body: { family: "", size: "", weight: "", backgroundColor: "" },
          h1: { family: "", size: "", weight: "" },
          h2: { family: "", size: "", weight: "" },
          h3: { family: "", size: "", weight: "" },
          primaryBackgroundColor: "",
        },
        computedBackgroundAssets: [],
        screenshotPngs: { desktop: TINY_PNG },
      }),
    );

    const result = await h.invoke({ url: "https://example.test/", forceRendered: true });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    const digest = (result.payload as { digest: { fetchPath: string; commentary: { whatsMissing: string[] } } }).digest;
    expect(digest.fetchPath).toBe("static");
    const cited = digest.commentary.whatsMissing.some((m) =>
      /budget/i.test(m) && /exhausted/i.test(m),
    );
    expect(cited).toBe(true);
  });
});
