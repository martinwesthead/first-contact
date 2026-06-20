import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ImageGallery from "../packages/framework/src/modules/image-gallery/index.astro";

const asset = (id: string) => ({ id, src: `/img/${id}.jpg`, alt: id });

describe("UAT FC REQ-41: image-gallery renders caption only when provided", () => {
  it("emits a figcaption per item that has a caption and skips items without one", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ImageGallery, {
      props: {
        variant: "grid",
        items: [
          { image: asset("a"), caption: "Plated entrée" },
          { image: asset("b") },
          { image: asset("c"), caption: "Dessert" },
        ],
      },
    });

    const captions = html.match(/fc-image-gallery__caption/g) ?? [];
    expect(captions.length).toBe(2);
    expect(html).toMatch(/Plated entr/);
    expect(html).toMatch(/Dessert/);
  });
});
