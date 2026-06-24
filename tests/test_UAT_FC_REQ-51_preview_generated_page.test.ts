import { describe, expect, it } from "vitest";
import type { Site } from "@gendev/site-schema";
import { chargeBrowserBudget, DEFAULT_BROWSER_BUDGET } from "../packages/web-fetch-safety/src/index.js";
import {
  expectOkPayload,
  makeFakeDriver,
  makePreviewHarness,
  TINY_PNG,
} from "./_helpers_REQ-51_preview.js";
import type { PreviewDigest } from "../packages/extractor/src/index.js";
import { buildEmptyScaffold } from "@gendev/builder-ui";

function siteWithContent(): Site {
  const scaffold = buildEmptyScaffold({ businessName: "Closed-Loop Co" });
  return {
    ...scaffold,
    pages: [
      {
        ...scaffold.pages[0],
        title: "Home",
        modules: [
          {
            id: "site-header",
            type: "header",
            version: 1,
            variant: "top-nav",
            content: {
              logo: "Closed-Loop Co",
              entries: [
                { label: "Home", target: { kind: "page", pageId: "home" } },
              ],
            },
          },
          {
            id: "home-hero",
            type: "text-block",
            version: 1,
            content: {
              heading: "Welcome to Closed-Loop Co",
              body: "<p>We make tools that close the AI perception loop.</p>",
            },
          },
        ],
      },
    ],
  };
}

describe("UAT FC REQ-51: preview_generated_page closes the AI's perception loop", () => {
  it("AC1: pageId omitted defaults to the home page; all three viewport screenshots persist under previews/{accountId}/{draftId}/{pageId}/", async () => {
    const h = makePreviewHarness({ accountId: "acct-ac1" });
    h.installDriver(makeFakeDriver());

    const result = await h.invoke({});
    const payload = expectOkPayload(result);
    expect(payload.kind).toBe("preview_digest");

    const digest = payload.digest as PreviewDigest;
    expect(digest.fetchPath).toBe("rendered");
    expect(digest.screenshotKeys.mobile).toBeTruthy();
    expect(digest.screenshotKeys.tablet).toBeTruthy();
    expect(digest.screenshotKeys.desktop).toBeTruthy();

    // Every screenshot key MUST live under the previews/{accountId}/{draftId}/{pageId}/ prefix.
    const prefix = `previews/acct-ac1/${digest.previewSource.draftId}/${digest.previewSource.pageId}/`;
    expect(digest.screenshotKeys.mobile!.startsWith(prefix)).toBe(true);
    expect(digest.screenshotKeys.tablet!.startsWith(prefix)).toBe(true);
    expect(digest.screenshotKeys.desktop!.startsWith(prefix)).toBe(true);
    expect(digest.screenshotKeys.mobile!.endsWith("/mobile.png")).toBe(true);
    expect(digest.screenshotKeys.tablet!.endsWith("/tablet.png")).toBe(true);
    expect(digest.screenshotKeys.desktop!.endsWith("/desktop.png")).toBe(true);

    // The bytes actually landed in R2.
    const desktopObj = await h.env.ASSETS_BUCKET.get(digest.screenshotKeys.desktop!);
    expect(desktopObj).not.toBeNull();
  });

  it("AC2: previewSource carries accountId, draftId (non-empty), pageId, and an ISO capturedAt timestamp", async () => {
    const h = makePreviewHarness({ accountId: "acct-ac2", sessionId: "sess-ac2" });
    h.installDriver(makeFakeDriver());

    const before = Date.now();
    const result = await h.invoke({});
    const after = Date.now();
    const digest = (expectOkPayload(result).digest as PreviewDigest);

    expect(digest.previewSource.accountId).toBe("acct-ac2");
    expect(digest.previewSource.pageId).toBe("home");
    expect(digest.previewSource.draftId.length).toBeGreaterThan(0);
    expect(/^[0-9a-f]+$/.test(digest.previewSource.draftId)).toBe(true);

    // ISO 8601 with millisecond precision, parsable as a date in the call window.
    expect(digest.previewSource.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    const ts = Date.parse(digest.previewSource.capturedAt);
    expect(Number.isNaN(ts)).toBe(false);
    expect(ts).toBeGreaterThanOrEqual(before - 5);
    expect(ts).toBeLessThanOrEqual(after + 5);
  });

  it("AC3: compareToDigestId resolving produces a non-empty inspirationDelta containing at least one comparison phrase", async () => {
    const h = makePreviewHarness();
    h.installDriver(makeFakeDriver());
    await h.seedReferenceDigest("https://acme.test/");
    h.setAnthropicResponse({
      summary: "Generated preview shows a left-aligned hero on a white background.",
      perSection: { layout: "left-aligned, sparse density" },
      inspirationDelta:
        "Your hero is left-aligned; the inspiration is centered. The inspiration uses a denser, warmer palette while your preview reads lighter and cooler.",
    });

    const result = await h.invoke({ compareToDigestId: "https://acme.test/" });
    const payload = expectOkPayload(result);
    expect(typeof payload.inspirationDelta).toBe("string");
    const delta = payload.inspirationDelta as string;
    expect(delta.length).toBeGreaterThan(0);
    expect(/aligned|centered|left|denser|sparser|lighter|heavier|warmer|cooler|tighter|looser/i.test(delta)).toBe(true);
  });

  it("AC4: compareToDigestId that doesn't resolve returns the digest with inspirationDelta undefined and a whatsMissing entry — no error", async () => {
    const h = makePreviewHarness();
    h.installDriver(makeFakeDriver());
    // No seeded digest for the URL we'll request.
    h.setAnthropicResponse({
      summary: "Preview-only summary (no inspiration loaded).",
      perSection: {},
    });

    const result = await h.invoke({ compareToDigestId: "https://nothing-here.test/" });
    const payload = expectOkPayload(result);

    expect(payload.inspirationDelta).toBeUndefined();
    const digest = payload.digest as PreviewDigest;
    const cited = digest.commentary.whatsMissing.some((m) =>
      m.includes("compareToDigestId") && m.includes("nothing-here.test"),
    );
    expect(cited).toBe(true);
  });

  it("REQ-51 amendment: BROWSER binding missing — digest still surfaces structural signals (headings, content tree) extracted from the in-memory rendered HTML, not an empty 'not_detected' shape", async () => {
    const h = makePreviewHarness({
      site: siteWithContent(),
      withBrowserBinding: false,
    });
    // No installDriver — the BROWSER-missing branch must not invoke the
    // driver factory at all.

    const result = await h.invoke({});
    const payload = expectOkPayload(result);
    const digest = payload.digest as PreviewDigest;

    // No screenshots (visual capture skipped).
    expect(digest.screenshotKeys.mobile).toBeUndefined();
    expect(digest.screenshotKeys.tablet).toBeUndefined();
    expect(digest.screenshotKeys.desktop).toBeUndefined();

    // fetchPath flagged 'static' so the chat card / consumers can tell at
    // a glance this is a degraded digest.
    expect(digest.fetchPath).toBe("static");

    // The structural signals MUST contain the real page content the
    // operator put into the draft — not an empty all-not_detected shape.
    const headings = digest.signals.content.headings.map((h) => h.text);
    expect(headings).toContain("Welcome to Closed-Loop Co");
    expect(digest.signals.assetInventory.length + digest.signals.content.sectionCount + digest.signals.content.headings.length).toBeGreaterThan(0);

    // The reason for the degradation is surfaced at the top of whatsMissing
    // so the operator knows why they aren't seeing screenshots.
    expect(digest.commentary.whatsMissing[0]).toMatch(/BROWSER binding/);

    // Summary mentions the page id and a non-zero heading count.
    expect(digest.summary).toMatch(/home/);
    expect(digest.summary).toMatch(/headings/);
  });

  it("AC5: budget-exhausted call succeeds with empty screenshots and a whatsMissing entry citing the exhausted budget (parity with analyze_page AC10)", async () => {
    const h = makePreviewHarness({ accountId: "acct-exh", sessionId: "sess-exh" });

    // Burn the full session budget in advance — same shape as the REQ-22 budget test.
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

    h.installDriver(
      makeFakeDriver({
        screenshotPngs: { desktop: TINY_PNG, mobile: TINY_PNG, tablet: TINY_PNG },
      }),
    );

    const result = await h.invoke({});
    const payload = expectOkPayload(result);
    const digest = payload.digest as PreviewDigest;
    expect(digest.screenshotKeys.mobile).toBeUndefined();
    expect(digest.screenshotKeys.tablet).toBeUndefined();
    expect(digest.screenshotKeys.desktop).toBeUndefined();
    const cited = digest.commentary.whatsMissing.some((m) =>
      /budget/i.test(m) && /exhausted/i.test(m),
    );
    expect(cited).toBe(true);
  });

  it("AC2/AC4 combined: explicit pageId picks the requested page; unknown pageId fails with a descriptive error naming known ids", async () => {
    const h = makePreviewHarness();

    h.installDriver(makeFakeDriver());
    const goodPageId = await h.invoke({ pageId: "home" });
    const goodDigest = (expectOkPayload(goodPageId).digest as PreviewDigest);
    expect(goodDigest.previewSource.pageId).toBe("home");

    // No driver needed — the bad-pageId guard fails before render. Don't
    // re-install; if the guard accidentally falls through to the driver,
    // the test should fail loudly.
    const badResult = await h.invoke({ pageId: "nonexistent" });
    expect(badResult.status).toBe("failed");
    if (badResult.status === "failed") {
      expect(badResult.error).toMatch(/pageId 'nonexistent' not found/);
      expect(badResult.error).toMatch(/home/);
    }
  });

  it("draftId is content-addressed: same draft produces the same draftId; changed draft produces a different one", async () => {
    const h = makePreviewHarness({ accountId: "acct-draft" });

    // The harness clears the driver factory after each invoke; re-install
    // before every call so the fake driver stays in scope.
    h.installDriver(makeFakeDriver());
    const first = await h.invoke({});
    const firstDigest = expectOkPayload(first).digest as PreviewDigest;

    // Same draft state → same draftId (stable across calls).
    h.installDriver(makeFakeDriver());
    const second = await h.invoke({});
    const secondDigest = expectOkPayload(second).digest as PreviewDigest;
    expect(secondDigest.previewSource.draftId).toBe(firstDigest.previewSource.draftId);

    // Mutate the draft (rename the home page's title) → rendered HTML
    // changes → draftId (a content hash) MUST change.
    const newSite = JSON.parse(JSON.stringify(h.ctx.siteDefinition));
    newSite.config.businessName = "Different Co";
    newSite.pages[0].title = "Different Page Title";
    (h.ctx as { siteDefinition: unknown }).siteDefinition = newSite;
    h.installDriver(makeFakeDriver());
    const third = await h.invoke({});
    const thirdDigest = expectOkPayload(third).digest as PreviewDigest;
    expect(thirdDigest.previewSource.draftId).not.toBe(firstDigest.previewSource.draftId);
  });
});
