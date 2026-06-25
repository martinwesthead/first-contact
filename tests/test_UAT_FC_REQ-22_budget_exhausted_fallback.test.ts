import { describe, expect, it } from "vitest";
import { DEFAULT_BROWSER_BUDGET } from "../packages/web-fetch-safety/src/index.js";
import {
  loadFixture,
  makeFakeDriver,
  makeHarness,
  TINY_PNG,
} from "./_helpers_REQ-22_rendered.js";

describe("UAT FC REQ-22: budget-exhausted falls back to static (AC 10)", () => {
  it("AC10: when the session browser budget is exhausted, analyze_page returns ok with fetchPath='static' and a whatsMissing entry citing the budget", async () => {
    const h = makeHarness({ sessionId: "sess-exh", accountId: "acct-exh" });

    // BUG-17: defaults are 1e9s. The handler doesn't accept a config
    // override, so to exercise the budget-exhausted fallback we seed the
    // session counter directly with a spent value >= the (huge) cap.
    const nowSec = Math.floor(Date.now() / 1000);
    await h.env.BROWSER_BUDGET_KV.put(
      "bb:session:sess-exh",
      JSON.stringify({
        spentSeconds: DEFAULT_BROWSER_BUDGET.sessionMaxSeconds,
        resetsAt: nowSec + 24 * 60 * 60,
      }),
    );
    expect(DEFAULT_BROWSER_BUDGET.sessionMaxSeconds).toBeGreaterThanOrEqual(1_000_000_000);

    // Render-by-default (REQ-22 Amendment 2026-06-24): every analyze_page
    // call attempts the rendered path. The budget gate fires inside
    // runRenderedPath and the call falls back to the static digest with a
    // whatsMissing note — that's what this test verifies.
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

    const result = await h.invoke({ url: "https://example.test/" });
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
