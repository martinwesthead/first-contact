// @vitest-environment jsdom
//
// Reconciliation UATs for story-15bae45e (STORY-56) — the render-by-default
// acceptance criteria of the analyze_page action, as reframed by BUNDLE-10
// (REQ-53 + BUG-17).
//
// The bundle inverts the old static-first / conditional-escalation model: the
// Browser-Rendering (rendered) path now runs UNCONDITIONALLY on every call —
// there is no escalation heuristic and no `forceRendered` tool-input. The
// static path is the degraded fallback used only when BROWSER is missing, the
// per-session Browser-Rendering budget is exhausted, or the rendered driver
// throws (BUG-17 raised the default budget to ~1e9s so the cap effectively
// never trips for production callers).
//
// This file covers the render-by-default cluster:
//   AC-617  analyze_page renders by default (rendered fetchPath, computed
//           typography, all three screenshot keys)
//   AC-618  budget exhaustion degrades to the static path without failing
//   AC-622  end-to-end: a JS-SPA URL renders a digest card by default
//   AC-822  a static-rich (non-SPA) page renders by default even when the
//           static extractors would have sufficed
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearToolResultRenderers,
  registerDigestReport,
  renderMarkdownToDom,
  renderToolResult,
} from "@gendev/builder-ui";
import {
  ReferenceDigest,
  renderDigestMarkdown,
} from "../packages/extractor/src/index.js";
import {
  chargeBrowserBudget,
  DEFAULT_BROWSER_BUDGET,
} from "../packages/web-fetch-safety/src/index.js";
import {
  loadFixture,
  makeFakeDriver,
  makeHarness,
  TINY_PNG,
} from "./_helpers_REQ-22_rendered.js";

const NOT_DETECTED = "not_detected";

/** A fake rendered driver returning concrete computed typography + screenshots. */
function renderedDriver(opts?: { backgroundUrl?: string }) {
  return makeFakeDriver({
    html: `<!doctype html><html><body><h1>Build with Acme</h1><p>${"A".repeat(1100)}</p></body></html>`,
    computedStyles: {
      body: { family: "Inter, system-ui", size: "16px", weight: "400", backgroundColor: "rgb(255, 255, 255)" },
      h1: { family: "Inter, system-ui", size: "48px", weight: "700" },
      h2: { family: "Inter, system-ui", size: "32px", weight: "700" },
      h3: { family: "Inter, system-ui", size: "24px", weight: "600" },
      primaryBackgroundColor: "rgb(255, 255, 255)",
    },
    computedBackgroundAssets: opts?.backgroundUrl
      ? [{ url: opts.backgroundUrl, selector: ".hero" }]
      : [],
    screenshotPngs: { mobile: TINY_PNG, tablet: TINY_PNG, desktop: TINY_PNG },
  });
}

// --- AC-617 -----------------------------------------------------------------

describe("UAT AC-617: analyze_page renders by default and returns a digest with rendered fetchPath, computed typography, and all three screenshot keys", () => {
  it("test_UAT_AC617_renders_by_default_with_screenshots_and_computed_typography", async () => {
    // No escalation heuristic, no forceRendered input: a plain content-rich
    // (non-SPA) URL drives the rendered path with nothing but `url` supplied.
    const h = makeHarness({ claudeApiKey: null });
    h.setHtmlBody(loadFixture("plain-html-site"));
    h.installDriver(renderedDriver());

    const result = await h.invoke({ url: "https://acme.test/" });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const digest = ReferenceDigest.parse(
      (result.payload as { digest: unknown }).digest,
    );

    // Rendered path was taken unconditionally.
    expect(digest.fetchPath).toBe("rendered");

    // Computed typography is resolved (computed values win over static).
    expect(digest.signals.typography.body.family).not.toBe(NOT_DETECTED);
    expect(digest.signals.typography.body.family).toBe("Inter, system-ui");

    // All three viewport screenshot keys populated, ending in /{viewport}.png.
    expect(digest.screenshotKeys.mobile).toMatch(/\/mobile\.png$/);
    expect(digest.screenshotKeys.tablet).toMatch(/\/tablet\.png$/);
    expect(digest.screenshotKeys.desktop).toMatch(/\/desktop\.png$/);
  });
});

// --- AC-618 -----------------------------------------------------------------

describe("UAT AC-618: Browser-Rendering budget exhaustion degrades analyze_page to the static path without failing the action", () => {
  it("test_UAT_AC618_budget_exhaustion_degrades_to_static_without_failing", async () => {
    const h = makeHarness({ sessionId: "sess-exh", accountId: "acct-exh", claudeApiKey: null });

    // Pre-seed the session browser-budget counter to its configured maximum so
    // the budget gate reports exhausted before the rendered driver runs.
    // BUG-17 raised the default session ceiling to ~1e9s, so the seed must use
    // the actual configured maximum, not an arbitrary small value.
    await chargeBrowserBudget(
      { BROWSER_BUDGET_KV: h.env.BROWSER_BUDGET_KV },
      {
        accountId: "acct-exh",
        sessionId: "sess-exh",
        costSeconds: DEFAULT_BROWSER_BUDGET.sessionMaxSeconds,
      },
    );

    // The rendered path is attempted by default; the budget gate (not a
    // heuristic and not a forceRendered toggle) forces the static fallback.
    h.setHtmlBody(loadFixture("plain-html-site"));
    h.installDriver(renderedDriver());

    const result = await h.invoke({ url: "https://example.test/" });

    // The action still succeeds — it does NOT return a failure.
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const digest = (result.payload as {
      digest: { fetchPath: string; commentary: { whatsMissing: string[] } };
    }).digest;

    // Degraded to the static path...
    expect(digest.fetchPath).toBe("static");
    // ...and whatsMissing cites the exhausted Browser-Rendering budget.
    const cited = digest.commentary.whatsMissing.some(
      (m) => /budget/i.test(m) && /exhausted/i.test(m),
    );
    expect(cited).toBe(true);
  });
});

// --- AC-622 -----------------------------------------------------------------

describe("UAT AC-622: end-to-end — pasting a JS-SPA URL renders a digest card by default with all three screenshots, computed typography, and a computed background-image inventory", () => {
  beforeEach(() => {
    clearToolResultRenderers();
    registerDigestReport();
  });
  afterEach(() => {
    clearToolResultRenderers();
    document.body.innerHTML = "";
  });

  it("test_UAT_AC622_end_to_end_spa_render_by_default_card_with_screenshots_and_background", async () => {
    const h = makeHarness({ claudeApiKey: "model-key" });
    h.setHtmlBody(loadFixture("js-spa"));
    h.setAnthropicCommentary({
      summary: "A centered SPA landing page with a single decisive hero composition.",
      perSection: { typography: "Inter throughout." },
      whatsMissing: [],
    });
    // Inject a rendered driver whose computed background-image is one the static
    // parse never saw (/hero-bg.jpg lives only in computed styles). The same
    // render-by-default path applies to a JS-SPA as to a static-rich page.
    h.installDriver(renderedDriver({ backgroundUrl: "/hero-bg.jpg" }));

    const result = await h.invoke({ url: "https://acme.test/" });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    const payload = result.payload as { digest: unknown; digestMarkdown: string };
    const digest = ReferenceDigest.parse(payload.digest);

    // Rendered path: three screenshot keys + computed typography.
    expect(digest.fetchPath).toBe("rendered");
    expect(digest.screenshotKeys.mobile).toMatch(/\/mobile\.png$/);
    expect(digest.screenshotKeys.tablet).toMatch(/\/tablet\.png$/);
    expect(digest.screenshotKeys.desktop).toMatch(/\/desktop\.png$/);
    expect(digest.signals.typography.body.family).toBe("Inter, system-ui");

    // The computed-only hero background folded into the inventory as a
    // kind: "background" record.
    const heroBg = digest.signals.assetInventory.find((a) =>
      a.url.endsWith("/hero-bg.jpg"),
    );
    expect(heroBg).toBeDefined();
    expect(heroBg?.kind).toBe("background");

    // The rendered card shows three screenshot figures and >=1 background thumb.
    const node = renderToolResult({
      doc: document,
      result: {
        ok: true,
        applied: {
          tool: "analyze_page",
          args: { url: digest.sourceUrl },
          summary: "produced reference digest",
          kind: "reference_digest",
          data: { kind: "reference_digest", digest, digestMarkdown: payload.digestMarkdown, cache: "MISS" },
        },
      },
      renderMarkdown: (md) => renderMarkdownToDom(document, md),
    }) as HTMLElement;

    expect(node.querySelectorAll("[data-fc-digest-screenshot]").length).toBe(3);
    expect(
      node.querySelectorAll('[data-fc-digest-thumb-kind="background"]').length,
    ).toBeGreaterThanOrEqual(1);
  });
});

// --- AC-822 -----------------------------------------------------------------

describe("UAT AC-822: analyze_page renders a static-rich (non-SPA) page by default, returning rendered fetchPath and screenshots", () => {
  it("test_UAT_AC822_static_rich_page_renders_by_default", async () => {
    // A content-rich, non-SPA fixture whose visible body text comfortably
    // exceeds the old thin-body threshold — under the old static-first model
    // this page would have stayed on the static path. With render-by-default
    // there is no body-density / script-ratio gate, so it renders anyway.
    const h = makeHarness({ claudeApiKey: null });
    const staticHtml = loadFixture("plain-html-site");
    h.setHtmlBody(staticHtml);
    h.installDriver(renderedDriver());

    const result = await h.invoke({ url: "https://richsite.test/" });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const digest = ReferenceDigest.parse(
      (result.payload as { digest: unknown }).digest,
    );

    // Static signals are genuinely rich (the page would have sufficed on the
    // static path) — yet the action still rendered.
    expect(digest.signals.content.headings.length).toBeGreaterThan(0);

    // Rendered by default, with all three viewport screenshots populated.
    expect(digest.fetchPath).toBe("rendered");
    expect(digest.screenshotKeys.mobile).toMatch(/\/mobile\.png$/);
    expect(digest.screenshotKeys.tablet).toMatch(/\/tablet\.png$/);
    expect(digest.screenshotKeys.desktop).toMatch(/\/desktop\.png$/);
  });
});
