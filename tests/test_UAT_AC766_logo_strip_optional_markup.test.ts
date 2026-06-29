import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import LogoStrip from "../packages/framework/src/modules/logo-strip/index.astro";

const validImage = { id: "i1", src: "/assets/logo.png", alt: "Acme" };

/**
 * AC-766: Optional content is rendered only when supplied. A `heading` renders
 * a section heading (h2) only when present. An item `label` on the `features`
 * variant renders a visible label only when present. In all variants, when an
 * item carries a `label` it is used as the image's alt text; absent a label,
 * the image's own alt is used.
 */
describe("UAT AC-766: logo-strip emits optional heading, label, and href markup only when those fields are present", () => {
  it("test_UAT_AC766_optional_heading_and_label_render_only_when_supplied_and_label_drives_alt", async () => {
    const container = await AstroContainer.create();

    // Heading present → an h2 heading element is emitted.
    const withHeading = await container.renderToString(LogoStrip, {
      props: {
        variant: "logos",
        heading: "As seen in",
        items: [{ image: validImage }],
      },
    });
    expect(withHeading).toMatch(/<h2[^>]*fc-logo-strip__heading[^>]*>As seen in/);

    // Heading absent → no heading element.
    const noHeading = await container.renderToString(LogoStrip, {
      props: { variant: "logos", items: [{ image: validImage }] },
    });
    expect(noHeading).not.toMatch(/fc-logo-strip__heading/);

    // Features variant: visible label only for items that carry a label.
    const features = await container.renderToString(LogoStrip, {
      props: {
        variant: "features",
        items: [
          { image: { ...validImage, id: "labeled" }, label: "Fast" },
          { image: { ...validImage, id: "bare" } },
        ],
      },
    });
    // Exactly one visible label element, bearing the labeled item's text.
    expect(features).toMatch(/fc-logo-strip__label[^>]*>Fast/);
    expect(features.match(/fc-logo-strip__label/g)?.length).toBe(1);

    // A label is used as the image's alt text when present (any variant).
    const labeledAlt = await container.renderToString(LogoStrip, {
      props: {
        variant: "logos",
        items: [{ image: validImage, label: "Partner Co" }],
      },
    });
    expect(labeledAlt).toMatch(/alt="Partner Co"/);

    // Absent a label, the image's own alt text is used.
    const fallbackAlt = await container.renderToString(LogoStrip, {
      props: { variant: "logos", items: [{ image: validImage }] },
    });
    expect(fallbackAlt).toMatch(/alt="Acme"/);
  });
});
