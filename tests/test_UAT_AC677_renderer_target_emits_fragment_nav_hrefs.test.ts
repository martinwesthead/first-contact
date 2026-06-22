import { describe, expect, it } from "vitest";
import { renderSiteToHtml } from "@gendev/framework/render";
import { makeTwoPageSite } from "./_helpers_BUG-3_multipage_site.js";

/**
 * AC-677: The framework site renderer accepts a `target: 'preview' | 'production'`
 * option (default 'production'). In preview mode, page-nav links (nav entries
 * whose target kind is `page`) are emitted as fragment hrefs `#/<pageId>`. With
 * the default / production target the same links are emitted as absolute paths
 * `/<pageId>`, and production output is byte-for-byte unchanged by the option's
 * existence.
 */
describe("UAT AC-677: site renderer target option emits fragment page-nav hrefs in preview, absolute in production", () => {
  it("test_UAT_AC677_preview_target_emits_fragment_hrefs_production_emits_absolute_unchanged", () => {
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

    // Adding the option leaves production output byte-for-byte unchanged: the
    // default (option omitted) and the explicit production target are identical.
    expect(defaultHtml).toBe(productionHtml);
  });
});

function extractHeader(html: string): string {
  const m = /<header[\s\S]*?<\/header>/.exec(html);
  if (!m) throw new Error("no <header> in rendered HTML");
  return m[0];
}
