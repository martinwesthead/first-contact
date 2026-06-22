import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { Banner } from "@gendev/framework";

// AC-760: the banner variants are visual-only. Whether the CTA renders depends
// solely on whether a cta content value is present, independent of the selected
// variant. with-cta without a cta renders no CTA; a cta value renders the CTA
// regardless of variant.
describe("UAT AC-760: CTA presence is driven by cta content, not the chosen variant", () => {
  it("test_UAT_AC760_cta_presence_driven_by_content_not_variant", async () => {
    const container = await AstroContainer.create();

    // with-cta variant but no cta value → no CTA element.
    const ctaVariantNoCta = await container.renderToString(Banner, {
      props: {
        variant: "with-cta",
        heading: "Heading only, no CTA",
      },
    });
    expect(ctaVariantNoCta).toMatch(/data-variant="with-cta"/);
    expect(ctaVariantNoCta).not.toMatch(/fc-banner__cta/);

    // simple variant but a cta value supplied → CTA element renders anyway.
    const simpleVariantWithCta = await container.renderToString(Banner, {
      props: {
        variant: "simple",
        heading: "Simple with a CTA",
        cta: { label: "Get started", href: "/start" },
      },
    });
    expect(simpleVariantWithCta).toMatch(/data-variant="simple"/);
    expect(simpleVariantWithCta).toMatch(
      /<a[^>]+class="fc-banner__cta"[^>]+href="\/start"[^>]*>\s*Get started\s*<\/a>/,
    );
  });
});
