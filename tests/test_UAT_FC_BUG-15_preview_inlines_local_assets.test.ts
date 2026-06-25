import { describe, expect, it } from "vitest";
import type { Site } from "@gendev/site-schema";
import { buildEmptyScaffold } from "@gendev/builder-ui";
import {
  expectOkPayload,
  makeFakeDriver,
  makePreviewHarness,
  TINY_PNG,
} from "./_helpers_REQ-51_preview.js";
import type { BrowserDriver, Viewport } from "@gendev/extractor";

const DATA_URL_PREFIX = "data:text/html;charset=utf-8;base64,";

/**
 * Decode the data: URL the preview handler passes to the browser driver back
 * to the HTML string the headless browser would actually see.
 */
function decodeNavigationHtml(url: string): string {
  expect(url.startsWith(DATA_URL_PREFIX)).toBe(true);
  const b64 = url.slice(DATA_URL_PREFIX.length);
  return typeof Buffer !== "undefined"
    ? Buffer.from(b64, "base64").toString("utf-8")
    : atob(b64);
}

/**
 * Spy driver that captures the URL it is asked to navigate to so the test can
 * assert on the inlined HTML the browser sees rather than the un-inlined HTML
 * the renderer originally produced.
 */
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

const HERO_JPG_BYTES = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
]);

function expectedDataUrl(bytes: Uint8Array, contentType: string): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return `data:${contentType};base64,${btoa(bin)}`;
}

function siteWithHeroImage(opts: { heroKey: string; logoKey?: string }): Site {
  const scaffold = buildEmptyScaffold({ businessName: "Hero Co" });
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
              logo: opts.logoKey
                ? { id: opts.logoKey, src: `/assets/${opts.logoKey}`, alt: "Hero Co" }
                : "Hero Co",
              entries: [
                { label: "Home", target: { kind: "page", pageId: "home" } },
              ],
            },
          },
          {
            id: "home-hero",
            type: "hero",
            version: 1,
            variant: "bg-image",
            content: {
              heading: "Welcome to Hero Co",
              image: {
                id: opts.heroKey,
                src: `/assets/${opts.heroKey}`,
                alt: "Hero Co hero image",
                kind: "image",
              },
            },
          },
        ],
      },
    ],
  };
}

function siteWithServicesGridImages(items: Array<{ key: string }>): Site {
  const scaffold = buildEmptyScaffold({ businessName: "Services Co" });
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
              logo: "Services Co",
              entries: [
                { label: "Home", target: { kind: "page", pageId: "home" } },
              ],
            },
          },
          {
            id: "services-grid",
            type: "services-grid",
            version: 1,
            variant: "three-col",
            content: {
              heading: "Services",
              items: items.map((it, idx) => ({
                heading: `Service ${idx + 1}`,
                body: "Description",
                image: {
                  id: it.key,
                  src: `/assets/${it.key}`,
                  alt: `Service ${idx + 1} photo`,
                  kind: "image",
                },
              })),
            },
          },
        ],
      },
    ],
  };
}

describe("UAT FC BUG-15: preview_generated_page inlines /assets/<key> refs as data: URLs so the headless browser can render them", () => {
  it("AC1: hero bg-image variant with /assets/<key> src — driver receives HTML whose hero <img> src is the data: URL of the R2-stored bytes", async () => {
    const heroKey = "sites/acct-bug15/imports/hero-image.jpg";
    const h = makePreviewHarness({
      site: siteWithHeroImage({ heroKey }),
      accountId: "acct-bug15",
    });
    await h.env.ASSETS_BUCKET.put(heroKey, HERO_JPG_BYTES, {
      httpMetadata: { contentType: "image/jpeg" },
    });
    const spy = makeUrlCapturingDriver();
    h.installDriver(spy.driver);

    const result = await h.invoke({});
    expectOkPayload(result);

    const observedUrl = spy.lastUrl();
    expect(observedUrl).not.toBeNull();
    const html = decodeNavigationHtml(observedUrl!);

    // Pre-fix the hero <img> had src="/assets/sites/acct-bug15/imports/hero-image.jpg".
    // Post-fix it must be the data: URL whose payload matches the R2 bytes.
    const expected = expectedDataUrl(HERO_JPG_BYTES, "image/jpeg");
    expect(html).toContain(`src="${expected}"`);
    expect(html).toMatch(/<img[^>]*class="fc-hero__bg-image"[^>]*src="data:image\/jpeg;base64,/);
    // No raw /assets/ refs may remain in any src attribute (this hero is the
    // only one in the fixture, so the assertion is exhaustive).
    expect(html).not.toMatch(/src="\/assets\//);
  });

  it("AC2: services-grid item images and a header logo with /assets/ refs are all inlined", async () => {
    const logoKey = "sites/acct-bug15/imports/logo.png";
    const itemKeys = [
      "sites/acct-bug15/imports/svc-1.png",
      "sites/acct-bug15/imports/svc-2.png",
      "sites/acct-bug15/imports/svc-3.png",
    ];
    const bytesByKey = new Map<string, Uint8Array>();
    bytesByKey.set(logoKey, TINY_PNG);
    for (const k of itemKeys) bytesByKey.set(k, TINY_PNG);

    // Compose a site that has a logo, a hero, and three services-grid items —
    // all with /assets/ srcs.
    const scaffold = buildEmptyScaffold({ businessName: "Multi Co" });
    const site: Site = {
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
                logo: { id: logoKey, src: `/assets/${logoKey}`, alt: "Multi Co" },
                entries: [
                  { label: "Home", target: { kind: "page", pageId: "home" } },
                ],
              },
            },
            {
              id: "services",
              type: "services-grid",
              version: 1,
              variant: "three-col",
              content: {
                heading: "Services",
                items: itemKeys.map((k, idx) => ({
                  heading: `Service ${idx + 1}`,
                  body: "Description",
                  image: {
                    id: k,
                    src: `/assets/${k}`,
                    alt: `Service ${idx + 1}`,
                    kind: "image",
                  },
                })),
              },
            },
          ],
        },
      ],
    };

    const h = makePreviewHarness({ site, accountId: "acct-bug15" });
    for (const [k, bytes] of bytesByKey) {
      await h.env.ASSETS_BUCKET.put(k, bytes, {
        httpMetadata: { contentType: "image/png" },
      });
    }
    const spy = makeUrlCapturingDriver();
    h.installDriver(spy.driver);

    const result = await h.invoke({});
    expectOkPayload(result);

    const html = decodeNavigationHtml(spy.lastUrl()!);
    const expected = expectedDataUrl(TINY_PNG, "image/png");

    // Every reference is rewritten — none of the original /assets/ srcs survive.
    expect(html).not.toMatch(/src="\/assets\//);
    // Logo and each services-grid item all share the same data URL since
    // their bytes are identical. Four occurrences total (1 logo + 3 items).
    const count = (html.match(new RegExp(escapeForRegex(`src="${expected}"`), "g")) ?? []).length;
    expect(count).toBe(4);
  });

  it("AC3: a /assets/<key> ref pointing at a missing R2 object preserves the original src and does not crash the preview", async () => {
    const heroKey = "sites/acct-bug15/imports/never-uploaded.jpg";
    const h = makePreviewHarness({
      site: siteWithHeroImage({ heroKey }),
      accountId: "acct-bug15",
    });
    // Deliberately NOT putting the asset in R2.
    const spy = makeUrlCapturingDriver();
    h.installDriver(spy.driver);

    const result = await h.invoke({});
    expectOkPayload(result);

    const html = decodeNavigationHtml(spy.lastUrl()!);
    // Original src survives — gives the operator a visible broken-image cue
    // instead of silently dropping content.
    expect(html).toContain(`src="/assets/${heroKey}"`);
    // And no spurious data: URL was substituted.
    expect(html).not.toMatch(
      new RegExp(`fc-hero__bg-image[^>]*src="data:`),
    );
  });

  it("AC4: services-grid where one item resolves and one is missing — resolved item is inlined, missing item keeps its /assets/ src (per-asset graceful degradation)", async () => {
    const presentKey = "sites/acct-bug15/imports/present.png";
    const missingKey = "sites/acct-bug15/imports/missing.png";
    const site = siteWithServicesGridImages([
      { key: presentKey },
      { key: missingKey },
    ]);
    const h = makePreviewHarness({ site, accountId: "acct-bug15" });
    await h.env.ASSETS_BUCKET.put(presentKey, TINY_PNG, {
      httpMetadata: { contentType: "image/png" },
    });
    const spy = makeUrlCapturingDriver();
    h.installDriver(spy.driver);

    const result = await h.invoke({});
    expectOkPayload(result);

    const html = decodeNavigationHtml(spy.lastUrl()!);
    const expected = expectedDataUrl(TINY_PNG, "image/png");
    expect(html).toContain(`src="${expected}"`);
    expect(html).toContain(`src="/assets/${missingKey}"`);
  });

  it("AC5: draftId is computed from the canonical (un-inlined) HTML so it stays stable across changes to R2 asset bytes", async () => {
    const heroKey = "sites/acct-bug15/imports/stability.png";
    const h = makePreviewHarness({
      site: siteWithHeroImage({ heroKey }),
      accountId: "acct-bug15",
    });
    await h.env.ASSETS_BUCKET.put(heroKey, TINY_PNG, {
      httpMetadata: { contentType: "image/png" },
    });
    h.installDriver(makeFakeDriver());
    const first = expectOkPayload(await h.invoke({}));
    const firstDraftId = (first.digest as { previewSource: { draftId: string } })
      .previewSource.draftId;

    // Replace the asset bytes — the site definition (and therefore the
    // un-inlined HTML) is unchanged, so the content-addressed draftId must
    // stay stable. (If we hashed the inlined HTML, a re-upload of identical
    // bytes under a different etag would still match, but any byte change
    // would shift the hash — divorcing draftId from the site definition.)
    await h.env.ASSETS_BUCKET.put(heroKey, HERO_JPG_BYTES, {
      httpMetadata: { contentType: "image/jpeg" },
    });
    h.installDriver(makeFakeDriver());
    const second = expectOkPayload(await h.invoke({}));
    const secondDraftId = (second.digest as { previewSource: { draftId: string } })
      .previewSource.draftId;
    expect(secondDraftId).toBe(firstDraftId);
  });
});

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
