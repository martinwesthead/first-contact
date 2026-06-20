import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import SplitSection from "../packages/framework/src/modules/split-section/index.astro";

describe("UAT FC REQ-39: split-section omits optional fields when not provided", () => {
  it("does not render eyebrow or cta when both are absent", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SplitSection, {
      props: {
        variant: "image-left",
        image: { id: "i1", src: "/assets/photo.jpg", alt: "Photo" },
        heading: "Heading only",
        body: "<p>Body only.</p>",
      },
    });

    expect(html).not.toMatch(/fc-split-section__eyebrow/);
    expect(html).not.toMatch(/fc-split-section__cta/);
  });

  it("renders eyebrow and cta when both are provided", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SplitSection, {
      props: {
        variant: "image-left",
        image: { id: "i1", src: "/assets/photo.jpg", alt: "Photo" },
        eyebrow: "Why us",
        heading: "Heading",
        body: "<p>Body.</p>",
        cta: { label: "Learn more", href: "/about" },
      },
    });

    expect(html).toMatch(/fc-split-section__eyebrow[^>]*>\s*Why us\s*</);
    expect(html).toMatch(/fc-split-section__cta[^>]*href="\/about"[^>]*>\s*Learn more\s*</);
  });
});
