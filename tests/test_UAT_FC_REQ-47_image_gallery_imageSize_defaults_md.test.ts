import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ImageGallery from "../packages/framework/src/modules/image-gallery/index.astro";

const asset = (id: string) => ({ id, src: `/img/${id}.jpg`, alt: id });
const items = [{ image: asset("a") }, { image: asset("b") }];

describe("UAT FC REQ-47: image-gallery imageSize defaults to md when omitted", () => {
  it("renders fc-image-gallery--image-md by default", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ImageGallery, {
      props: { variant: "masonry", items },
    });
    expect(html).toMatch(/fc-image-gallery--image-md/);
    expect(html).not.toMatch(/fc-image-gallery--image-sm/);
    expect(html).not.toMatch(/fc-image-gallery--image-lg/);
  });
});
