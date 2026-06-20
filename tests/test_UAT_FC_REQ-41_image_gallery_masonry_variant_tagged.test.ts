import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ImageGallery from "../packages/framework/src/modules/image-gallery/index.astro";

const asset = (id: string) => ({ id, src: `/img/${id}.jpg`, alt: id });

describe("UAT FC REQ-41: image-gallery masonry variant tagged for CSS columns layout", () => {
  it("emits the masonry variant class so CSS columns rules apply", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ImageGallery, {
      props: {
        variant: "masonry",
        items: [
          { image: asset("a") },
          { image: asset("b") },
          { image: asset("c") },
        ],
      },
    });

    expect(html).toMatch(/data-variant="masonry"/);
    expect(html).toMatch(/fc-image-gallery--variant-masonry/);

    const figures = html.match(/fc-image-gallery__figure/g) ?? [];
    expect(figures.length).toBe(3);
  });
});
