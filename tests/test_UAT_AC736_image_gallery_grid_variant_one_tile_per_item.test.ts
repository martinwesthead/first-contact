import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ImageGallery from "../packages/framework/src/modules/image-gallery/index.astro";

// Astro's container renderer does not inline the scoped <style> block, so the
// 1:1-aspect-ratio rule is read from the module source and anchored to the
// variant class proven present in the rendered output.
const modulePath = fileURLToPath(
  new URL(
    "../packages/framework/src/modules/image-gallery/index.astro",
    import.meta.url,
  ),
);
const source = readFileSync(modulePath, "utf8");

const asset = (id: string) => ({ id, src: `/img/${id}.jpg`, alt: id });

describe("UAT AC-736: image-gallery grid variant renders one tile per item", () => {
  it("test_UAT_AC736_image_gallery_grid_variant_one_tile_per_item", async () => {
    const items = [
      { image: asset("a") },
      { image: asset("b") },
      { image: asset("c") },
      { image: asset("d") },
    ];

    const container = await AstroContainer.create();
    const html = await container.renderToString(ImageGallery, {
      props: { variant: "grid", items },
    });

    // Section is tagged grid and carries the grid variant class.
    expect(html).toMatch(/data-variant="grid"/);
    expect(html).toMatch(/fc-image-gallery--variant-grid/);

    // Exactly one image tile/figure per content item.
    const figures = html.match(/fc-image-gallery__figure/g) ?? [];
    expect(figures.length).toBe(items.length);

    // Each item's image source appears, rendered as a plain <img> with the
    // lazy/async loading hints.
    for (const item of items) {
      expect(html).toContain(`src="${item.image.src}"`);
    }
    const lazy = html.match(/loading="lazy"/g) ?? [];
    expect(lazy.length).toBe(items.length);
    const async = html.match(/decoding="async"/g) ?? [];
    expect(async.length).toBe(items.length);

    // Grid tiles are locked to a 1:1 aspect ratio via the scoped CSS, anchored
    // to the rendered grid variant class.
    expect(source).toMatch(
      /\.fc-image-gallery--variant-grid\s+\.fc-image-gallery__image\s*\{[^}]*aspect-ratio:\s*1\s*\/\s*1/,
    );
    expect(source).toMatch(
      /\.fc-image-gallery--variant-grid\s+\.fc-image-gallery__image\s*\{[^}]*object-fit:\s*cover/,
    );
  });
});
