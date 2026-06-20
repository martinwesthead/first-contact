import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import LogoStrip from "../packages/framework/src/modules/logo-strip/index.astro";

const validImage = { id: "i1", src: "/assets/logo.png", alt: "Acme" };

describe("UAT FC REQ-43: logo-strip variants emit distinguishing classes", () => {
  it("emits --variant-logos for the logos variant and hides the label visually", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(LogoStrip, {
      props: {
        variant: "logos",
        items: [{ image: validImage, label: "Acme" }],
      },
    });
    expect(html).toMatch(/data-variant="logos"/);
    expect(html).toMatch(/fc-logo-strip--variant-logos/);
    expect(html).not.toMatch(/fc-logo-strip__label/);
  });

  it("emits --variant-features for the features variant and shows the label", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(LogoStrip, {
      props: {
        variant: "features",
        items: [{ image: validImage, label: "Fast" }],
      },
    });
    expect(html).toMatch(/data-variant="features"/);
    expect(html).toMatch(/fc-logo-strip--variant-features/);
    expect(html).toMatch(/fc-logo-strip__label[^>]*>Fast/);
  });
});
