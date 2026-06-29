import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ImageGallery from "../packages/framework/src/modules/image-gallery/index.astro";

// The columns dial maps to a modifier class on the rendered section (proven
// from rendered output). The responsive contract — the chosen column count at
// and above md, single column below md — is proven from the scoped CSS, which
// Astro's container renderer does not inline, so it is read from source and
// anchored to the modifier classes proven present in the rendered output.
const modulePath = fileURLToPath(
  new URL(
    "../packages/framework/src/modules/image-gallery/index.astro",
    import.meta.url,
  ),
);
const source = readFileSync(modulePath, "utf8");

function sliceMediaBlock(src: string, openerMatch: string): string {
  const start = src.indexOf(openerMatch);
  if (start < 0) return "";
  let depth = 0;
  let i = src.indexOf("{", start);
  if (i < 0) return "";
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return "";
}

const asset = (id: string) => ({ id, src: `/img/${id}.jpg`, alt: id });
const items = [
  { image: asset("a") },
  { image: asset("b") },
  { image: asset("c") },
  { image: asset("d") },
];

async function render(props: Record<string, unknown>): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(ImageGallery, { props });
}

describe("UAT AC-739: image-gallery columns dial maps to a modifier class and collapses to one column below md", () => {
  it("test_UAT_AC739_image_gallery_columns_dial_maps_to_modifier_class_and_collapses_below_md", async () => {
    // Each columns value maps to its matching modifier class.
    for (const cols of ["2", "3", "4"] as const) {
      const html = await render({
        variant: "grid",
        items,
        dials: { columns: cols },
      });
      expect(html, `columns=${cols} emits fc-image-gallery--cols-${cols}`).toMatch(
        new RegExp(`fc-image-gallery--cols-${cols}`),
      );
    }

    // Omitting the dial defaults to cols-3.
    const defaulted = await render({ variant: "grid", items });
    expect(defaulted).toMatch(/fc-image-gallery--cols-3/);

    // Below md the base list rule is a single column for the grid variant.
    expect(source).toMatch(
      /\.fc-image-gallery--variant-grid\s+\.fc-image-gallery__list\s*\{[^}]*grid-template-columns:\s*1fr/,
    );

    // The chosen column count applies ONLY at and above the md (768px) breakpoint.
    expect(source).toMatch(/@media\s*\(\s*min-width:\s*768px\s*\)/);
    const mediaBlock = sliceMediaBlock(source, "@media (min-width: 768px)");
    expect(mediaBlock.length).toBeGreaterThan(0);
    expect(mediaBlock).toMatch(
      /\.fc-image-gallery--cols-2[^{]*\{[^}]*grid-template-columns:\s*repeat\(\s*2\s*,\s*1fr\s*\)/,
    );
    expect(mediaBlock).toMatch(
      /\.fc-image-gallery--cols-3[^{]*\{[^}]*grid-template-columns:\s*repeat\(\s*3\s*,\s*1fr\s*\)/,
    );
    expect(mediaBlock).toMatch(
      /\.fc-image-gallery--cols-4[^{]*\{[^}]*grid-template-columns:\s*repeat\(\s*4\s*,\s*1fr\s*\)/,
    );

    // Below md, nothing widens the grid past a single column.
    const baseCss = source.replace(mediaBlock, "");
    expect(baseCss).not.toMatch(/grid-template-columns:\s*repeat\(/);
  });
});
