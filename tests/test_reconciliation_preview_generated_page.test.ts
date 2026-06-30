import { describe, expect, it } from "vitest";
import type { Site } from "@gendev/site-schema";
import { buildEmptyScaffold } from "@gendev/builder-ui";
import { DEFAULT_BROWSER_BUDGET } from "../packages/web-fetch-safety/src/index.js";
import {
  findAction,
  visibleToolSpecs,
} from "../apps/control-app/src/operator/registry.js";
import {
  expectOkPayload,
  makeFakeDriver,
  makePreviewHarness,
  TINY_PNG,
} from "./_helpers_REQ-51_preview.js";
import type { BrowserDriver, PreviewDigest, Viewport } from "../packages/extractor/src/index.js";

const DATA_URL_PREFIX = "data:text/html;charset=utf-8;base64,";

const JPG_BYTES = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
]);

function decodeNavigationHtml(url: string): string {
  expect(url.startsWith(DATA_URL_PREFIX)).toBe(true);
  const b64 = url.slice(DATA_URL_PREFIX.length);
  return typeof Buffer !== "undefined"
    ? Buffer.from(b64, "base64").toString("utf-8")
    : atob(b64);
}

function expectedDataUrl(bytes: Uint8Array, contentType: string): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return `data:${contentType};base64,${btoa(bin)}`;
}

/** Spy driver that records the URL it was asked to navigate to. */
function makeUrlCapturingDriver(): { driver: BrowserDriver; lastUrl: () => string | null } {
  let captured: string | null = null;
  const fake = makeFakeDriver();
  const driver: BrowserDriver = {
    async renderForViewports(url: string, viewports: readonly Viewport[]) {
      captured = url;
      return fake.renderForViewports(url, viewports);
    },
  };
  return { driver, lastUrl: () => captured };
}

/** Draft with a single home page carrying a real heading. */
function siteWithContent(businessName = "Closed-Loop Co"): Site {
  const scaffold = buildEmptyScaffold({ businessName });
  return {
    ...scaffold,
    pages: [
      {
        ...scaffold.pages[0],
        title: "Home",
        modules: [
          {
            id: "home-hero",
            type: "text-block",
            version: 1,
            content: {
              heading: "Welcome to Closed-Loop Co",
              body: "<p>We close the AI perception loop.</p>",
            },
          },
        ],
      },
    ],
  };
}

/** Draft whose hero references a local /assets/<key> image. */
function siteWithHeroImage(heroKey: string): Site {
  const scaffold = buildEmptyScaffold({ businessName: "Hero Co" });
  return {
    ...scaffold,
    pages: [
      {
        ...scaffold.pages[0],
        title: "Home",
        modules: [
          {
            id: "home-hero",
            type: "hero",
            version: 1,
            variant: "bg-image",
            content: {
              heading: "Welcome to Hero Co",
              image: {
                id: heroKey,
                src: `/assets/${heroKey}`,
                alt: "Hero image",
                kind: "image",
              },
            },
          },
        ],
      },
    ],
  };
}

/** Draft with a header logo, a hero, and a services-grid — all /assets refs. */
function siteWithAllImagery(opts: {
  logoKey: string;
  heroKey: string;
  itemKeys: string[];
}): Site {
  const scaffold = buildEmptyScaffold({ businessName: "Multi Co" });
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
              logo: { id: opts.logoKey, src: `/assets/${opts.logoKey}`, alt: "Multi Co" },
              entries: [{ label: "Home", target: { kind: "page", pageId: "home" } }],
            },
          },
          {
            id: "home-hero",
            type: "hero",
            version: 1,
            variant: "bg-image",
            content: {
              heading: "Welcome",
              image: { id: opts.heroKey, src: `/assets/${opts.heroKey}`, alt: "Hero", kind: "image" },
            },
          },
          {
            id: "services",
            type: "services-grid",
            version: 1,
            variant: "three-col",
            content: {
              heading: "Services",
              items: opts.itemKeys.map((k, idx) => ({
                heading: `Service ${idx + 1}`,
                body: "Description",
                image: { id: k, src: `/assets/${k}`, alt: `Service ${idx + 1}`, kind: "image" },
              })),
            },
          },
        ],
      },
    ],
  };
}

/** Draft with a services-grid of N items, used for mixed present/missing assets. */
function siteWithServicesGridImages(keys: string[]): Site {
  const scaffold = buildEmptyScaffold({ businessName: "Services Co" });
  return {
    ...scaffold,
    pages: [
      {
        ...scaffold.pages[0],
        title: "Home",
        modules: [
          {
            id: "services-grid",
            type: "services-grid",
            version: 1,
            variant: "three-col",
            content: {
              heading: "Services",
              items: keys.map((k, idx) => ({
                heading: `Service ${idx + 1}`,
                body: "Description",
                image: { id: k, src: `/assets/${k}`, alt: `Service ${idx + 1}`, kind: "image" },
              })),
            },
          },
        ],
      },
    ],
  };
}

/** Two-page draft so an explicit pageId can select the non-default page. */
function multiPageSite(): Site {
  const scaffold = buildEmptyScaffold({ businessName: "Two Page Co" });
  return {
    ...scaffold,
    pages: [
      { ...scaffold.pages[0], title: "Home" },
      {
        id: "about",
        slug: "/about",
        title: "About",
        modules: [
          {
            id: "about-intro",
            type: "text-block",
            version: 1,
            content: { heading: "About Two Page Co", body: "<p>Who we are.</p>" },
          },
        ],
      },
    ],
  };
}

describe("Reconciliation UATs: preview_generated_page (story-bab9b773)", () => {
  it("test_UAT_AC838_tool_registered_trial_tier_with_self_inspection_spec", () => {
    const action = findAction("preview_generated_page");
    expect(action).toBeDefined();
    expect(action?.category).toBe("system_action");
    expect(typeof action?.handler).toBe("function");
    expect(action?.plan_tier).toBe("trial");

    // Tool spec visible at the trial tier exposes the optional inputs.
    const specs = visibleToolSpecs("trial");
    const spec = specs.find((s) => s.name === "preview_generated_page");
    expect(spec).toBeDefined();
    const schema = spec!.input_schema as {
      type: string;
      properties: Record<string, unknown>;
      required?: string[];
    };
    expect(schema.type).toBe("object");
    expect(Object.keys(schema.properties).sort()).toEqual([
      "compareToDigestId",
      "pageId",
    ]);
    expect(schema.required ?? []).toEqual([]);

    // Description conveys the self-inspection use case.
    const desc = action!.tool_spec.description;
    expect(/your (own )?work|what (does )?this page (look|looks)/i.test(desc)).toBe(true);
  });

  it("test_UAT_AC823_default_page_three_viewport_screenshots_under_previews_namespace", async () => {
    const h = makePreviewHarness({ accountId: "acct-823" });
    h.installDriver(makeFakeDriver());

    const result = await h.invoke({});
    const payload = expectOkPayload(result);
    expect(payload.kind).toBe("preview_digest");

    const digest = payload.digest as PreviewDigest;
    expect(digest.screenshotKeys.mobile).toBeTruthy();
    expect(digest.screenshotKeys.tablet).toBeTruthy();
    expect(digest.screenshotKeys.desktop).toBeTruthy();

    const prefix = `previews/acct-823/${digest.previewSource.draftId}/${digest.previewSource.pageId}/`;
    for (const key of [
      digest.screenshotKeys.mobile!,
      digest.screenshotKeys.tablet!,
      digest.screenshotKeys.desktop!,
    ]) {
      expect(key.startsWith(prefix)).toBe(true);
      expect(key.startsWith("references/")).toBe(false);
    }

    // Bytes actually landed in R2 under that key.
    const stored = await h.env.ASSETS_BUCKET.get(digest.screenshotKeys.desktop!);
    expect(stored).not.toBeNull();
  });

  it("test_UAT_AC824_previewSource_carries_account_draft_page_and_iso_capture_time", async () => {
    const h = makePreviewHarness({ accountId: "acct-824" });
    h.installDriver(makeFakeDriver());

    const result = await h.invoke({});
    const digest = expectOkPayload(result).digest as PreviewDigest;

    expect(digest.previewSource.accountId).toBe("acct-824");
    expect(digest.previewSource.pageId).toBe("home");
    expect(digest.previewSource.draftId.length).toBeGreaterThan(0);

    // capturedAt parses as a real ISO-8601 timestamp.
    expect(digest.previewSource.capturedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
    expect(Number.isNaN(Date.parse(digest.previewSource.capturedAt))).toBe(false);
  });

  it("test_UAT_AC825_draftId_content_addressed_and_stable_across_asset_availability", async () => {
    // Part 1: identical draft state → identical draftId; a content change → different draftId.
    const hc = makePreviewHarness({ accountId: "acct-825", site: siteWithContent() });
    hc.installDriver(makeFakeDriver());
    const first = (expectOkPayload(await hc.invoke({})).digest as PreviewDigest).previewSource.draftId;

    hc.installDriver(makeFakeDriver());
    const second = (expectOkPayload(await hc.invoke({})).digest as PreviewDigest).previewSource.draftId;
    expect(second).toBe(first);

    // Mutate the draft (rename the page) → rendered HTML changes → draftId changes.
    const mutated = JSON.parse(JSON.stringify(hc.ctx.siteDefinition)) as Site;
    mutated.pages[0].title = "A Totally Different Heading";
    (hc.ctx as { siteDefinition: unknown }).siteDefinition = mutated;
    hc.installDriver(makeFakeDriver());
    const third = (expectOkPayload(await hc.invoke({})).digest as PreviewDigest).previewSource.draftId;
    expect(third).not.toBe(first);

    // Part 2: changing only a referenced asset's stored bytes leaves draftId unchanged,
    // because draftId hashes the canonical (pre-inlining) render.
    const heroKey = "sites/acct-825/imports/stability.png";
    const ha = makePreviewHarness({ accountId: "acct-825", site: siteWithHeroImage(heroKey) });
    await ha.env.ASSETS_BUCKET.put(heroKey, TINY_PNG, { httpMetadata: { contentType: "image/png" } });
    ha.installDriver(makeFakeDriver());
    const beforeBytes = (expectOkPayload(await ha.invoke({})).digest as PreviewDigest).previewSource.draftId;

    await ha.env.ASSETS_BUCKET.put(heroKey, JPG_BYTES, { httpMetadata: { contentType: "image/jpeg" } });
    ha.installDriver(makeFakeDriver());
    const afterBytes = (expectOkPayload(await ha.invoke({})).digest as PreviewDigest).previewSource.draftId;
    expect(afterBytes).toBe(beforeBytes);
  });

  it("test_UAT_AC826_explicit_pageId_selects_requested_page", async () => {
    const h = makePreviewHarness({ accountId: "acct-826", site: multiPageSite() });
    h.installDriver(makeFakeDriver());

    const result = await h.invoke({ pageId: "about" });
    const digest = expectOkPayload(result).digest as PreviewDigest;
    expect(digest.previewSource.pageId).toBe("about");
  });

  it("test_UAT_AC827_unknown_pageId_returns_descriptive_failure_naming_known_ids", async () => {
    const h = makePreviewHarness({ accountId: "acct-827", site: multiPageSite() });
    // No driver installed — the guard must fail before any render.

    const result = await h.invoke({ pageId: "nonexistent" });
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.error).toContain("nonexistent");
      expect(result.error).toContain("home");
      expect(result.error).toContain("about");
    }
  });

  it("test_UAT_AC828_resolving_compareToDigestId_yields_inspirationDelta_with_comparison_term", async () => {
    const h = makePreviewHarness({ accountId: "acct-828" });
    h.installDriver(makeFakeDriver());
    await h.seedReferenceDigest("https://acme.test/");
    h.setAnthropicResponse({
      summary: "Preview shows a left-aligned hero on white.",
      perSection: { layout: "left-aligned, sparse" },
      inspirationDelta:
        "Your hero is left-aligned; the inspiration is centered. The inspiration is denser and warmer; your preview reads lighter.",
    });

    const result = await h.invoke({ compareToDigestId: "https://acme.test/" });
    const payload = expectOkPayload(result);
    expect(typeof payload.inspirationDelta).toBe("string");
    const delta = payload.inspirationDelta as string;
    expect(delta.length).toBeGreaterThan(0);
    expect(
      /aligned|centered|left|denser|sparser|lighter|heavier|warmer|cooler|tighter|looser/i.test(delta),
    ).toBe(true);
  });

  it("test_UAT_AC829_unresolvable_compareToDigestId_is_non_fatal_with_whatsMissing_note", async () => {
    const h = makePreviewHarness({ accountId: "acct-829" });
    h.installDriver(makeFakeDriver());
    h.setAnthropicResponse({ summary: "Preview only (no inspiration loaded).", perSection: {} });

    const result = await h.invoke({ compareToDigestId: "https://nothing-here.test/" });
    const payload = expectOkPayload(result);
    expect(payload.inspirationDelta).toBeUndefined();

    const digest = payload.digest as PreviewDigest;
    const cited = digest.commentary.whatsMissing.some(
      (m) => m.includes("compareToDigestId") && m.includes("nothing-here.test"),
    );
    expect(cited).toBe(true);
  });

  it("test_UAT_AC830_no_browser_rendering_degrades_to_structural_signals", async () => {
    const h = makePreviewHarness({ site: siteWithContent(), withBrowserBinding: false });
    // No driver installed — the BROWSER-missing branch must not invoke it.

    const result = await h.invoke({});
    const digest = expectOkPayload(result).digest as PreviewDigest;

    // Degraded digest: static fetch path, no screenshots.
    expect(digest.fetchPath).toBe("static");
    expect(digest.screenshotKeys.mobile).toBeUndefined();
    expect(digest.screenshotKeys.tablet).toBeUndefined();
    expect(digest.screenshotKeys.desktop).toBeUndefined();

    // Real structural signals extracted from the rendered draft, not an empty shape.
    const headings = digest.signals.content.headings.map((x) => x.text);
    expect(headings).toContain("Welcome to Closed-Loop Co");

    // First whatsMissing entry cites the missing BROWSER binding.
    expect(digest.commentary.whatsMissing[0]).toMatch(/BROWSER binding/);
  });

  it("test_UAT_AC831_exhausted_browser_budget_degrades_gracefully", async () => {
    const h = makePreviewHarness({ accountId: "acct-831", sessionId: "sess-831" });

    // BUG-17 raised defaults to ~1e9s; seed the session counter at/above the cap
    // to trip the budget-exhausted fallback.
    const nowSec = Math.floor(Date.now() / 1000);
    await h.env.BROWSER_BUDGET_KV.put(
      "bb:session:sess-831",
      JSON.stringify({
        spentSeconds: DEFAULT_BROWSER_BUDGET.sessionMaxSeconds,
        resetsAt: nowSec + 24 * 60 * 60,
      }),
    );
    h.installDriver(makeFakeDriver());

    const result = await h.invoke({});
    const payload = expectOkPayload(result);
    expect(payload.kind).toBe("preview_digest");

    const digest = payload.digest as PreviewDigest;
    expect(digest.screenshotKeys.mobile).toBeUndefined();
    expect(digest.screenshotKeys.tablet).toBeUndefined();
    expect(digest.screenshotKeys.desktop).toBeUndefined();
    const cited = digest.commentary.whatsMissing.some(
      (m) => /budget/i.test(m) && /exhausted/i.test(m),
    );
    expect(cited).toBe(true);
  });

  it("test_UAT_AC832_captured_inline_and_sourceUrl_is_synthetic_preview_scheme", async () => {
    const h = makePreviewHarness({ accountId: "acct-832", site: siteWithContent() });
    const spy = makeUrlCapturingDriver();
    h.installDriver(spy.driver);

    const result = await h.invoke({});
    const digest = expectOkPayload(result).digest as PreviewDigest;

    // (a) The content handed to the rendering engine is an inline data: URL that
    // decodes to HTML containing the draft's own headings (no external round-trip).
    const navUrl = spy.lastUrl();
    expect(navUrl).not.toBeNull();
    const html = decodeNavigationHtml(navUrl!);
    expect(html).toContain("Welcome to Closed-Loop Co");

    // (b) sourceUrl is a synthetic preview:// identifier, never http(s) or data:.
    expect(digest.sourceUrl.startsWith("preview://")).toBe(true);
    expect(digest.sourceUrl).not.toMatch(/^https?:/);
    expect(digest.sourceUrl).not.toMatch(/^data:/);
  });

  it("test_UAT_AC833_local_assets_are_inlined_for_hero_services_grid_and_logo", async () => {
    const logoKey = "sites/acct-833/imports/logo.png";
    const heroKey = "sites/acct-833/imports/hero.png";
    const itemKeys = [
      "sites/acct-833/imports/svc-1.png",
      "sites/acct-833/imports/svc-2.png",
    ];
    const h = makePreviewHarness({
      accountId: "acct-833",
      site: siteWithAllImagery({ logoKey, heroKey, itemKeys }),
    });
    for (const k of [logoKey, heroKey, ...itemKeys]) {
      await h.env.ASSETS_BUCKET.put(k, TINY_PNG, { httpMetadata: { contentType: "image/png" } });
    }
    const spy = makeUrlCapturingDriver();
    h.installDriver(spy.driver);

    const result = await h.invoke({});
    expectOkPayload(result);

    const html = decodeNavigationHtml(spy.lastUrl()!);
    const expected = expectedDataUrl(TINY_PNG, "image/png");
    // Every existing /assets reference is inlined as a data: URL...
    expect(html).toContain(`data:image/png;base64,`);
    expect(html).toContain(expected);
    // ...and no unresolved /assets/ src survives (all four assets exist in storage).
    expect(html).not.toMatch(/src="\/assets\//);
  });

  it("test_UAT_AC834_missing_asset_preserves_original_src_per_asset_graceful_degradation", async () => {
    const presentKey = "sites/acct-834/imports/present.png";
    const missingKey = "sites/acct-834/imports/missing.png";
    const h = makePreviewHarness({
      accountId: "acct-834",
      site: siteWithServicesGridImages([presentKey, missingKey]),
    });
    // Only the present key is stored; the missing key is deliberately absent.
    await h.env.ASSETS_BUCKET.put(presentKey, TINY_PNG, { httpMetadata: { contentType: "image/png" } });
    const spy = makeUrlCapturingDriver();
    h.installDriver(spy.driver);

    const result = await h.invoke({});
    // Call completes successfully — one missing asset must not crash the preview.
    expectOkPayload(result);

    const html = decodeNavigationHtml(spy.lastUrl()!);
    // Resolvable reference is inlined...
    expect(html).toContain(expectedDataUrl(TINY_PNG, "image/png"));
    // ...while the missing reference keeps its original /assets/ src.
    expect(html).toContain(`src="/assets/${missingKey}"`);
  });
});
