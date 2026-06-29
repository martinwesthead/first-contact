import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import SplitSection from "../packages/framework/src/modules/split-section/index.astro";

// AC-744: rendering the image-right variant produces a section marked as
// image-right, but the media still precedes the content in DOM order — the
// right-side placement is a desktop-only visual reorder (CSS `order`), so
// narrow/mobile widths stack image-first.
describe("UAT AC-744: image-right variant flips desktop layout, preserves image-first DOM order", () => {
  it("test_UAT_AC744_split_section_image_right_variant", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SplitSection, {
      props: {
        variant: "image-right",
        image: { id: "i1", src: "/assets/photo.jpg", alt: "Photo" },
        heading: "Right side",
        body: "<p>Body.</p>",
      },
    });

    // Section carries the image-right variant marker.
    expect(html).toMatch(/data-variant="image-right"/);
    expect(html).toMatch(/fc-split-section--variant-image-right/);

    // Media still precedes content in source order (mobile stacks image-first).
    const mediaIdx = html.indexOf("fc-split-section__media");
    const contentIdx = html.indexOf("fc-split-section__content");
    expect(mediaIdx).toBeGreaterThan(-1);
    expect(contentIdx).toBeGreaterThan(-1);
    expect(mediaIdx).toBeLessThan(contentIdx);
  });
});
