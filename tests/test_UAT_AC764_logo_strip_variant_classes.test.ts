import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import LogoStrip from "../packages/framework/src/modules/logo-strip/index.astro";

const validImage = { id: "i1", src: "/assets/logo.png", alt: "Acme" };

/**
 * AC-764: The chosen variant is reflected in the rendered output.
 * `variant=logos` emits a `--variant-logos` distinguishing class and
 * `data-variant="logos"`, and item labels are NOT rendered as visible label
 * text. `variant=features` emits `--variant-features` and
 * `data-variant="features"`, and each item's label IS rendered as visible
 * label text.
 */
describe("UAT AC-764: logo-strip variant selects logos vs features class and label visibility", () => {
  it("test_UAT_AC764_variant_emits_distinguishing_class_and_controls_label_visibility", async () => {
    const container = await AstroContainer.create();

    const logosHtml = await container.renderToString(LogoStrip, {
      props: {
        variant: "logos",
        items: [{ image: validImage, label: "Acme" }],
      },
    });
    expect(logosHtml).toMatch(/fc-logo-strip--variant-logos/);
    expect(logosHtml).toMatch(/data-variant="logos"/);
    // Label is alt-text-only on the logos variant — no visible label element.
    expect(logosHtml).not.toMatch(/fc-logo-strip__label/);

    const featuresHtml = await container.renderToString(LogoStrip, {
      props: {
        variant: "features",
        items: [{ image: validImage, label: "Fast" }],
      },
    });
    expect(featuresHtml).toMatch(/fc-logo-strip--variant-features/);
    expect(featuresHtml).toMatch(/data-variant="features"/);
    // Visible label element bearing the item's label text.
    expect(featuresHtml).toMatch(/fc-logo-strip__label[^>]*>Fast/);
  });
});
