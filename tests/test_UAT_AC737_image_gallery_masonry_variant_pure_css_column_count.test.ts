import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ImageGallery from "../packages/framework/src/modules/image-gallery/index.astro";

// The masonry layout is achieved with pure-CSS column-count rules, read from
// the module source and anchored to the masonry variant class proven present
// in the rendered output. The "no client JS / no hydration" claim is proven
// from the rendered output itself: no <script> is emitted.
const modulePath = fileURLToPath(
  new URL(
    "../packages/framework/src/modules/image-gallery/index.astro",
    import.meta.url,
  ),
);
const source = readFileSync(modulePath, "utf8");

const asset = (id: string) => ({ id, src: `/img/${id}.jpg`, alt: id });

describe("UAT AC-737: image-gallery masonry variant uses a pure-CSS column-count layout", () => {
  it("test_UAT_AC737_image_gallery_masonry_variant_pure_css_column_count", async () => {
    const items = [
      { image: asset("a") },
      { image: asset("b") },
      { image: asset("c") },
    ];

    const container = await AstroContainer.create();
    const html = await container.renderToString(ImageGallery, {
      props: { variant: "masonry", items },
    });

    // Section is tagged masonry and carries the masonry variant class.
    expect(html).toMatch(/data-variant="masonry"/);
    expect(html).toMatch(/fc-image-gallery--variant-masonry/);

    // One figure per content item.
    const figures = html.match(/fc-image-gallery__figure/g) ?? [];
    expect(figures.length).toBe(items.length);

    // No client-side JavaScript / hydration is emitted — the layout is static.
    expect(html).not.toMatch(/<script/);

    // The masonry layout is driven by CSS column-count on the list, scoped to
    // the masonry variant class.
    expect(source).toMatch(
      /\.fc-image-gallery--variant-masonry[^{]*\.fc-image-gallery__list\s*\{[^}]*column-count/,
    );

    // Natural aspect ratios flow under masonry: the 1:1 lock is scoped to the
    // grid variant only, never to masonry.
    expect(source).not.toMatch(
      /\.fc-image-gallery--variant-masonry[^{]*\{[^}]*aspect-ratio:\s*1\s*\/\s*1/,
    );
  });
});
