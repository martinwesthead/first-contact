import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ImageGallery from "../packages/framework/src/modules/image-gallery/index.astro";

const asset = (id: string) => ({ id, src: `/img/${id}.jpg`, alt: id });

const baseItems = [{ image: asset("a") }, { image: asset("b") }];

describe("UAT FC REQ-41: image-gallery heading is optional", () => {
  it("renders heading when provided", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ImageGallery, {
      props: { variant: "grid", heading: "Our Work", items: baseItems },
    });

    expect(html).toMatch(/fc-image-gallery__heading/);
    expect(html).toMatch(/Our Work/);
  });

  it("omits heading when not provided", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ImageGallery, {
      props: { variant: "grid", items: baseItems },
    });

    expect(html).not.toMatch(/fc-image-gallery__heading/);
  });
});
