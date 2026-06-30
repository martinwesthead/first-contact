import { describe, expect, it } from "vitest";
import {
  extractSignals,
  extractExternalStylesheetAssets,
  mergeStylesheetAssets,
  type StylesheetFetcher,
} from "../packages/extractor/src/index.js";

/**
 * AC-788 — the static extraction path fetches `<link rel=stylesheet>`
 * resources and folds their `background-image` url() values into the asset
 * inventory: absolute-resolved against the stylesheet's own URL, deduped by
 * URL (existing entries keep their kind and increment references), `@media`
 * rules captured, `data:` URLs excluded, `@import` chains not followed, and a
 * failed stylesheet fetch skipped without breaking extraction.
 */
describe("UAT AC-788: static path fetches external stylesheets and adds their background-image assets to the inventory", () => {
  const BASE = "https://acme.test/";

  // Document: links one external stylesheet, declares one `<style>`-block
  // background (the inline/<style> fallback), and references /shared.jpg as an
  // <img> — the same absolute URL the stylesheet also declares as a background.
  const html = `<!doctype html><html><head>
      <link rel="stylesheet" href="/css/theme.css">
      <style>.local { background-image: url(/local-bg.png); }</style>
    </head><body>
      <img src="/shared.jpg" alt="Shared">
    </body></html>`;

  // Stylesheet served from https://acme.test/css/theme.css, so relative url()
  // values resolve against /css/ — not the document root.
  const themeCss = `
    .hero { background-image: url(/shared.jpg); }
    .banner { background-image: url(banner.png); }
    .icon { background-image: url(data:image/png;base64,AAAA); }
    @media (min-width: 768px) {
      .feature { background-image: url(/feature-bg.jpg); }
    }
    @import url('/imported.css');
  `;

  it("test_UAT_AC788_static_external_stylesheet_backgrounds", async () => {
    const fetcher: StylesheetFetcher = async (url) => {
      if (url === "https://acme.test/css/theme.css") {
        return { ok: true, text: themeCss };
      }
      // Served only to prove @import is NOT followed: this URL is never fetched.
      if (url === "https://acme.test/imported.css") {
        return { ok: true, text: `.imp { background-image: url(/imported-bg.png); }` };
      }
      return { ok: false };
    };

    // The static extraction path: Layer A signals, then external-stylesheet
    // enrichment, then merge into the inventory.
    const signals = extractSignals(html, BASE);
    expect(signals.imagery.backgroundCount).toBe(1); // only the <style> background so far

    const extra = await extractExternalStylesheetAssets(html, BASE, fetcher);
    const merged = mergeStylesheetAssets(signals, extra);

    const inv = merged.assetInventory;
    const find = (suffix: string) => inv.filter((a) => a.url.endsWith(suffix));

    // (d) a relative url() resolves against the STYLESHEET's URL (/css/), not
    // the document root → https://acme.test/css/banner.png, appearing once.
    const banner = find("/css/banner.png");
    expect(banner).toHaveLength(1);
    expect(banner[0].kind).toBe("background");
    expect(banner[0].url).toBe("https://acme.test/css/banner.png");
    expect(banner[0].references).toBe(1);

    // (b) a background nested inside an @media rule is captured, resolved
    // absolutely against the stylesheet origin.
    const feature = find("/feature-bg.jpg");
    expect(feature).toHaveLength(1);
    expect(feature[0].kind).toBe("background");
    expect(feature[0].url).toBe("https://acme.test/feature-bg.jpg");

    // The already-present URL (an <img src> AND a stylesheet background) stays
    // a single record, keeps kind 'img', and has its references incremented.
    const shared = find("/shared.jpg");
    expect(shared).toHaveLength(1);
    expect(shared[0].kind).toBe("img");
    expect(shared[0].references).toBe(2);

    // (c) data: URLs are excluded entirely.
    expect(inv.some((a) => a.url.startsWith("data:"))).toBe(false);

    // @import chains are not followed — the imported stylesheet's background
    // is absent even though the fetcher could have served it.
    expect(find("/imported-bg.png")).toHaveLength(0);

    // The <style>-block background is still present.
    expect(find("/local-bg.png")).toHaveLength(1);

    // The imagery summary's backgroundCount reflects the enriched inventory.
    const bgInInventory = inv.filter((a) => a.kind === "background").length;
    expect(merged.imagery.backgroundCount).toBe(bgInInventory);
    expect(merged.imagery.backgroundCount).toBe(3); // local-bg + banner + feature-bg

    // ── Second scenario: stylesheet fetch returns a non-ok result. ──────────
    // Extraction still succeeds, falling back to inline/<style> backgrounds.
    const failFetcher: StylesheetFetcher = async () => ({ ok: false });
    const extraFail = await extractExternalStylesheetAssets(html, BASE, failFetcher);
    expect(extraFail).toEqual([]);

    const mergedFail = mergeStylesheetAssets(signals, extraFail);
    const fallbackBgs = mergedFail.assetInventory
      .filter((a) => a.kind === "background")
      .map((a) => a.url);
    expect(fallbackBgs).toEqual(["https://acme.test/local-bg.png"]);
    expect(mergedFail.imagery.backgroundCount).toBe(1);
  });
});
