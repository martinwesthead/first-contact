import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ServicesGrid from "../packages/framework/src/modules/services-grid/index.astro";

const image = {
  id: "asset-1",
  src: "/assets/sites/abc/cover.jpg",
  alt: "Cover photo",
};

describe("UAT FC REQ-44: services-grid v2 renders item images and reflects the imageStyle dial", () => {
  it("renders an <img> sourced from item.image when present", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ServicesGrid, {
      props: {
        variant: "two-col",
        items: [
          { image, heading: "First", body: "<p>One.</p>" },
          { heading: "Second", body: "<p>Two.</p>" },
        ],
      },
    });

    expect(html).toMatch(/src="\/assets\/sites\/abc\/cover\.jpg"/);
    expect(html).toMatch(/alt="Cover photo"/);

    // Only the first item has an image; the second card must not gain one.
    const imgs = html.match(/<img\s/g) ?? [];
    expect(imgs.length).toBe(1);
  });

  it.each([
    ["icon", /fc-services-grid--image-icon/],
    ["cover", /fc-services-grid--image-cover/],
    ["thumb", /fc-services-grid--image-thumb/],
  ] as const)(
    "tags the section with the imageStyle=%s dial class",
    async (style, classPattern) => {
      const container = await AstroContainer.create();
      const html = await container.renderToString(ServicesGrid, {
        props: {
          variant: "three-col",
          items: [
            { image, heading: "A", body: "<p>a</p>" },
            { image, heading: "B", body: "<p>b</p>" },
            { image, heading: "C", body: "<p>c</p>" },
          ],
          dials: { imageStyle: style },
        },
      });

      expect(html).toMatch(classPattern);
    },
  );

  it("falls back to the icon imageStyle when no dial is provided", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ServicesGrid, {
      props: {
        variant: "one-col",
        items: [{ image, heading: "Solo", body: "<p>solo</p>" }],
      },
    });

    expect(html).toMatch(/fc-services-grid--image-icon/);
  });
});
