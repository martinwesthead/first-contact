import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ImageGallery from "../packages/framework/src/modules/image-gallery/index.astro";

const asset = (id: string) => ({ id, src: `/img/${id}.jpg`, alt: id });

describe("UAT FC REQ-41: image-gallery grid renders one tile per item", () => {
  it("emits a figure per item and tags the section grid", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ImageGallery, {
      props: {
        variant: "grid",
        items: [
          { image: asset("a") },
          { image: asset("b") },
          { image: asset("c") },
          { image: asset("d") },
        ],
      },
    });

    expect(html).toMatch(/data-variant="grid"/);
    expect(html).toMatch(/fc-image-gallery--variant-grid/);

    const figures = html.match(/fc-image-gallery__figure/g) ?? [];
    expect(figures.length).toBe(4);

    expect(html).toMatch(/src="\/img\/a\.jpg"/);
    expect(html).toMatch(/src="\/img\/d\.jpg"/);
    expect(html).toMatch(/loading="lazy"/);
  });
});
