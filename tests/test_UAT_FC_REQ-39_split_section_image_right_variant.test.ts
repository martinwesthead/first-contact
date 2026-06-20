import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import SplitSection from "../packages/framework/src/modules/split-section/index.astro";

describe("UAT FC REQ-39: split-section image-right variant", () => {
  it("emits the image-right variant class while preserving image-first DOM order for mobile stacking", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SplitSection, {
      props: {
        variant: "image-right",
        image: { id: "i1", src: "/assets/photo.jpg", alt: "Photo" },
        heading: "Right side",
        body: "<p>Body.</p>",
      },
    });

    expect(html).toMatch(/data-variant="image-right"/);
    expect(html).toMatch(/fc-split-section--variant-image-right/);

    // DOM order is always media → content; CSS `order` flips the visual layout
    // on desktop. Mobile naturally stacks in DOM order, giving image-first.
    const mediaIdx = html.indexOf("fc-split-section__media");
    const contentIdx = html.indexOf("fc-split-section__content");
    expect(mediaIdx).toBeGreaterThan(-1);
    expect(contentIdx).toBeGreaterThan(-1);
    expect(mediaIdx).toBeLessThan(contentIdx);
  });
});
