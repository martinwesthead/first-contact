import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import SplitSection from "../packages/framework/src/modules/split-section/index.astro";

describe("UAT FC REQ-39: split-section image-left variant", () => {
  it("emits the image-left variant class and renders media before content in DOM order", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SplitSection, {
      props: {
        variant: "image-left",
        image: { id: "i1", src: "/assets/photo.jpg", alt: "Photo" },
        heading: "Trust the team",
        body: "<p>About us.</p>",
      },
    });

    expect(html).toMatch(/data-variant="image-left"/);
    expect(html).toMatch(/fc-split-section--variant-image-left/);

    const mediaIdx = html.indexOf("fc-split-section__media");
    const contentIdx = html.indexOf("fc-split-section__content");
    expect(mediaIdx).toBeGreaterThan(-1);
    expect(contentIdx).toBeGreaterThan(-1);
    expect(mediaIdx).toBeLessThan(contentIdx);

    expect(html).toMatch(/src="\/assets\/photo\.jpg"/);
    expect(html).toMatch(/Trust the team/);
    expect(html).toMatch(/About us\./);
  });
});
