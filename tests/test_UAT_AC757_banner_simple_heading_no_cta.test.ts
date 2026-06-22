import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { Banner } from "@gendev/framework";

// AC-757: rendering the simple variant with a heading and no cta produces a
// published banner section tagged as the simple variant, carrying the heading
// text, with no CTA element.
describe("UAT AC-757: simple banner renders heading and emits no CTA when no cta provided", () => {
  it("test_UAT_AC757_simple_banner_renders_heading_and_emits_no_cta", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Banner, {
      props: {
        variant: "simple",
        heading: "Now booking spring weddings",
      },
    });

    // Tagged as a banner / simple-variant section.
    expect(html).toMatch(/data-module="banner"/);
    expect(html).toMatch(/data-variant="simple"/);
    expect(html).toMatch(/fc-banner--variant-simple/);

    // Heading text present.
    expect(html).toContain("Now booking spring weddings");

    // No CTA element.
    expect(html).not.toMatch(/fc-banner__cta/);
  });
});
