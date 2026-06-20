import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ImageGallery from "../packages/framework/src/modules/image-gallery/index.astro";

const asset = (id: string) => ({ id, src: `/img/${id}.jpg`, alt: id });
const items = [
  { image: asset("a") },
  { image: asset("b") },
  { image: asset("c") },
  { image: asset("d") },
];

describe("UAT FC REQ-41: image-gallery columns dial maps to modifier class", () => {
  it.each(["2", "3", "4"] as const)(
    "emits fc-image-gallery--cols-%s for columns=%s",
    async (cols) => {
      const container = await AstroContainer.create();
      const html = await container.renderToString(ImageGallery, {
        props: { variant: "grid", items, dials: { columns: cols } },
      });
      expect(html).toMatch(new RegExp(`fc-image-gallery--cols-${cols}`));
    },
  );

  it("defaults to cols-3 when columns dial is omitted", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ImageGallery, {
      props: { variant: "grid", items },
    });
    expect(html).toMatch(/fc-image-gallery--cols-3/);
  });
});
