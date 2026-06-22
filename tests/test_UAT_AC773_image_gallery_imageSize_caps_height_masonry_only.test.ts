import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { ImageGallery, imageGalleryMeta } from "@gendev/framework";

// The image-gallery declares an `imageSize` dial (sm/md/lg, default md). The
// selected value is emitted as `fc-image-gallery--image-<value>` on the section.
// In the masonry variant the dial caps image height; the grid variant keeps its
// fixed 1:1 tiles regardless of the dial.
//
// Class emission is proven from the real component render. The masonry max-height
// cap rules and the grid 1:1 lock are scoped <style> rules Astro's container
// renderer does not inline, so the CSS contract is read from the module source
// and anchored to the `image-<value>` / `variant-grid` classes proven present.
const asset = (id: string) => ({ id, src: `/img/${id}.jpg`, alt: id });
const items = [{ image: asset("a") }, { image: asset("b") }];

const source = readFileSync(
  resolve(
    process.cwd(),
    "packages/framework/src/modules/image-gallery/index.astro",
  ),
  "utf8",
);

async function renderMasonry(
  dials?: Record<string, string>,
): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(ImageGallery, {
    props: { variant: "masonry", items, ...(dials ? { dials } : {}) },
  });
}

describe("UAT AC-773: image-gallery imageSize dial caps masonry image height only", () => {
  it("test_UAT_AC773_image_gallery_imageSize_caps_height_masonry_only", async () => {
    // Meta declares the dial with exactly [sm, md, lg].
    const dials = imageGalleryMeta.dials as Record<string, readonly string[]>;
    expect(dials.imageSize).toEqual(["sm", "md", "lg"]);

    // Each value is emitted as its modifier class on the rendered section.
    for (const size of ["sm", "md", "lg"] as const) {
      const html = await renderMasonry({ imageSize: size });
      expect(
        html,
        `imageSize=${size} emits its modifier class`,
      ).toMatch(new RegExp(`fc-image-gallery--image-${size}`));
    }

    // Dial omitted → defaults to md.
    const defaulted = await renderMasonry();
    expect(defaulted).toMatch(/fc-image-gallery--image-md/);
    expect(defaulted).not.toMatch(/fc-image-gallery--image-sm/);
    expect(defaulted).not.toMatch(/fc-image-gallery--image-lg/);

    // Masonry max-height caps are keyed off the variant-masonry + image-<value>
    // classes (progressively larger caps, object-fit: contain).
    for (const size of ["sm", "md", "lg"] as const) {
      const capRule = new RegExp(
        `\\.fc-image-gallery--variant-masonry\\.fc-image-gallery--image-${size}[^{]*\\{[^}]*max-height:[^}]*\\}`,
      );
      const match = capRule.exec(source);
      expect(match, `masonry cap rule for image-${size}`).not.toBeNull();
      expect(match![0], `image-${size} cap uses object-fit: contain`).toMatch(
        /object-fit:\s*contain/,
      );
    }

    // The grid variant locks tiles to 1:1 cover — and that rule does NOT key off
    // the image-<value> dial, so the dial cannot alter grid sizing.
    const gridRuleMatch =
      /\.fc-image-gallery--variant-grid\s+\.fc-image-gallery__image\s*\{[^}]*\}/.exec(
        source,
      );
    expect(gridRuleMatch, "grid image rule present").not.toBeNull();
    const gridRule = gridRuleMatch![0];
    expect(gridRule).toMatch(/aspect-ratio:\s*1\s*\/\s*1/);
    expect(gridRule).toMatch(/object-fit:\s*cover/);
    expect(
      gridRule,
      "grid 1:1 rule is independent of the imageSize dial",
    ).not.toMatch(/fc-image-gallery--image-/);
  });
});
