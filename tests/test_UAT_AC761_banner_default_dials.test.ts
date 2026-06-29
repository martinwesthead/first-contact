import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { Banner } from "@1stcontact/framework";

// AC-761: when dials are omitted, the banner renders with its documented
// defaults: align = left, surface = default, size = md, and spacingTop =
// spacingBottom = 6 (tighter than the hero default of 12).
describe("UAT AC-761: banner applies default dials when dials are omitted", () => {
  it("test_UAT_AC761_banner_applies_default_dials_when_omitted", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Banner, {
      props: {
        variant: "simple",
        heading: "Defaults applied",
      },
    });

    // Default alignment, surface, and size.
    expect(html).toMatch(/fc-banner--align-left/);
    expect(html).toMatch(/fc-banner--surface-default/);
    expect(html).toMatch(/fc-banner--size-md/);

    // Default top/bottom spacing of 6 (banner-specific, tighter than hero).
    expect(html).toMatch(/fc-banner--space-top-6/);
    expect(html).toMatch(/fc-banner--space-bottom-6/);

    // Confirm the non-default spacing of the hero (12) is not applied here.
    expect(html).not.toMatch(/fc-banner--space-top-12/);
    expect(html).not.toMatch(/fc-banner--space-bottom-12/);
  });
});
