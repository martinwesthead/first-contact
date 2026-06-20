import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ImageGallery from "../packages/framework/src/modules/image-gallery/index.astro";

const asset = (id: string) => ({ id, src: `/img/${id}.jpg`, alt: id });
const items = [{ image: asset("a") }, { image: asset("b") }];

describe("UAT FC REQ-47: image-gallery imageSize dial maps to modifier class", () => {
  it.each(["sm", "md", "lg"] as const)(
    "emits fc-image-gallery--image-%s for imageSize=%s",
    async (size) => {
      const container = await AstroContainer.create();
      const html = await container.renderToString(ImageGallery, {
        props: { variant: "masonry", items, dials: { imageSize: size } },
      });
      expect(html).toMatch(new RegExp(`fc-image-gallery--image-${size}`));
    },
  );
});
