import { describe, expect, it } from "vitest";
import { renderSiteToHtml } from "@gendev/framework/render";
import { makeTwoPageSite } from "./_helpers_BUG-3_multipage_site.js";

/**
 * AC-678 (duplicate of AC-677): The framework site renderer accepts a
 * `target: 'preview' | 'production'` option (default 'production'). Preview mode
 * emits page-nav links as fragment hrefs `#/<pageId>`; default / production emit
 * absolute paths `/<pageId>`; production output is byte-for-byte unchanged by the
 * option's addition (URL and in-page-anchor hrefs are identical across targets).
 */
describe("UAT AC-678: site renderer target option emits fragment page-nav hrefs in preview, absolute in production", () => {
  it("test_UAT_AC678_preview_target_emits_fragment_hrefs_production_emits_absolute_unchanged", () => {
    const site = makeTwoPageSite();

    // Preview target: page-nav entries become fragment hrefs.
    const previewHeader = extractHeader(
      renderSiteToHtml(site, { target: "preview" }),
    );
    expect(previewHeader).toContain('href="#/home"');
    expect(previewHeader).toContain('href="#/menu"');
    expect(previewHeader).not.toContain('href="/menu"');

    // Default and explicit production target: page-nav entries stay absolute,
    // and neither carries the preview fragment form.
    const defaultHtml = renderSiteToHtml(site);
    const productionHtml = renderSiteToHtml(site, { target: "production" });
    for (const html of [defaultHtml, productionHtml]) {
      const header = extractHeader(html);
      expect(header).toContain('href="/home"');
      expect(header).toContain('href="/menu"');
      expect(header).not.toContain('href="#/home"');
      expect(header).not.toContain('href="#/menu"');
    }

    // Production output is byte-for-byte unchanged: default (option omitted)
    // equals the explicit production target.
    expect(defaultHtml).toBe(productionHtml);
  });
});

function extractHeader(html: string): string {
  const m = /<header[\s\S]*?<\/header>/.exec(html);
  if (!m) throw new Error("no <header> in rendered HTML");
  return m[0];
}
