import { describe, expect, it } from "vitest";
import { renderSiteToHtml } from "@gendev/framework/render";
import { makeTwoPageSite } from "./_helpers_BUG-3_multipage_site.js";

describe("UAT FC BUG-3: renderer emits hash-based nav hrefs in preview target", () => {
  it("target=preview produces nav links with #/<pageId> hrefs for kind:page entries", () => {
    const site = makeTwoPageSite();
    const html = renderSiteToHtml(site, { target: "preview" });
    // Pluck the header block so the assertions don't accidentally match other anchors.
    const headerHtml = extractHeader(html);
    expect(headerHtml).toContain('href="#/home"');
    expect(headerHtml).toContain('href="#/menu"');
    expect(headerHtml).not.toContain('href="/home"');
    expect(headerHtml).not.toContain('href="/menu"');
  });

  it("target=production (default) produces nav links with /<pageId> hrefs — production output is unchanged", () => {
    const site = makeTwoPageSite();
    const htmlDefault = renderSiteToHtml(site);
    const htmlExplicit = renderSiteToHtml(site, { target: "production" });
    for (const html of [htmlDefault, htmlExplicit]) {
      const headerHtml = extractHeader(html);
      expect(headerHtml).toContain('href="/home"');
      expect(headerHtml).toContain('href="/menu"');
      expect(headerHtml).not.toContain('href="#/home"');
      expect(headerHtml).not.toContain('href="#/menu"');
    }
  });
});

function extractHeader(html: string): string {
  const m = /<header[\s\S]*?<\/header>/.exec(html);
  if (!m) throw new Error("no <header> in rendered HTML");
  return m[0];
}
