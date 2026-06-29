import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { Banner } from "@1stcontact/framework";

// AC-759: when a banner is given a cta of { label, href }, the rendered section
// contains a single CTA link whose visible text is the label and whose
// navigation target is the href.
describe("UAT AC-759: banner renders a CTA button with the provided label and href", () => {
  it("test_UAT_AC759_banner_renders_cta_with_label_and_href", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Banner, {
      props: {
        variant: "with-cta",
        heading: "Limited spots remaining",
        cta: { label: "Reserve now", href: "/book" },
      },
    });

    // A single CTA anchor carrying the supplied label text and href target.
    const ctaMatches = html.match(/class="fc-banner__cta"/g) ?? [];
    expect(ctaMatches).toHaveLength(1);
    expect(html).toMatch(
      /<a[^>]+class="fc-banner__cta"[^>]+href="\/book"[^>]*>\s*Reserve now\s*<\/a>/,
    );
  });
});
