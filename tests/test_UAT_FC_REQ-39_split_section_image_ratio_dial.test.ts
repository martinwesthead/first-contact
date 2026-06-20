import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import SplitSection from "../packages/framework/src/modules/split-section/index.astro";

describe("UAT FC REQ-39: split-section imageRatio dial", () => {
  it.each(["square", "portrait", "landscape"] as const)(
    "applies the imageRatio=%s class to the section",
    async (imageRatio) => {
      const container = await AstroContainer.create();
      const html = await container.renderToString(SplitSection, {
        props: {
          variant: "image-left",
          image: { id: "i1", src: "/assets/photo.jpg", alt: "Photo" },
          heading: "H",
          body: "<p>B.</p>",
          dials: { imageRatio },
        },
      });

      expect(html).toMatch(new RegExp(`fc-split-section--ratio-${imageRatio}`));
    },
  );

  it("defaults to landscape when imageRatio is not provided", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SplitSection, {
      props: {
        variant: "image-left",
        image: { id: "i1", src: "/assets/photo.jpg", alt: "Photo" },
        heading: "H",
        body: "<p>B.</p>",
      },
    });

    expect(html).toMatch(/fc-split-section--ratio-landscape/);
  });
});
