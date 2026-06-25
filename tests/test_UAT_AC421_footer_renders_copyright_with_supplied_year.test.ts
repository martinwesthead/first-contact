import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { Footer } from "@1stcontact/framework";

describe("UAT AC-421: footer renders the copyright with the supplied year and holder without computing the year at render time", () => {
  it("test_UAT_AC421_footer_renders_copyright_with_supplied_year", async () => {
    // Use a year deliberately NOT equal to the current year — if the
    // implementation called new Date() at render, this test would fail.
    const holder = "Yesteryear Industries, Ltd.";
    const year = "1999";

    const container = await AstroContainer.create();
    const html1 = await container.renderToString(Footer, {
      props: { copyrightHolder: holder, copyrightYear: year },
    });

    // Copyright line is present with both values verbatim.
    expect(html1).toMatch(/fc-footer__copyright/);
    expect(html1).toContain(holder);
    expect(html1).toContain(year);
    // Current year (e.g. 2026) must NOT appear in the rendered copyright fragment.
    const copyrightMatch = /<p[^>]*class="[^"]*fc-footer__copyright[^"]*"[^>]*>[\s\S]*?<\/p>/.exec(
      html1,
    );
    expect(copyrightMatch).not.toBeNull();
    const copyrightHtml = copyrightMatch![0];
    expect(copyrightHtml).toContain(year);
    expect(copyrightHtml).toContain(holder);
    // The current year of the running test must not leak into the rendered fragment.
    const currentYear = String(new Date().getUTCFullYear());
    if (currentYear !== year) {
      expect(copyrightHtml).not.toContain(currentYear);
    }

    // Re-render with the same inputs → relevant copyright fragment is byte-identical.
    const container2 = await AstroContainer.create();
    const html2 = await container2.renderToString(Footer, {
      props: { copyrightHolder: holder, copyrightYear: year },
    });
    const copyrightMatch2 = /<p[^>]*class="[^"]*fc-footer__copyright[^"]*"[^>]*>[\s\S]*?<\/p>/.exec(
      html2,
    );
    expect(copyrightMatch2).not.toBeNull();
    expect(copyrightMatch2![0]).toBe(copyrightHtml);
  });
});
