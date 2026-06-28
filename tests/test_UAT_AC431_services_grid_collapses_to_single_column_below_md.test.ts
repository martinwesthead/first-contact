import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ServicesGrid from "../packages/framework/src/modules/services-grid/index.astro";

// Below the md breakpoint (<768px) both grid variants collapse to one column.
// We exercise the real component entry point (renderToString) to confirm the
// list element and variant marker the responsive CSS targets are actually
// emitted, then verify the scoped-CSS contract that governs the collapse:
// the base list rule is single-column (1fr) and every multi-column rule lives
// ONLY inside the min-width:768px media query — so below md, nothing widens it.
//
// Astro's container renderer does not inline the scoped <style> block, so the
// CSS rule text is read from the module source; it is anchored to the variant
// class proven present in the rendered output above.
const modulePath = fileURLToPath(
  new URL(
    "../packages/framework/src/modules/services-grid/index.astro",
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

async function renderVariant(
  variant: "two-col" | "three-col",
  itemCount: number,
): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(ServicesGrid, {
    props: {
      variant,
      items: Array.from({ length: itemCount }, (_, n) => ({
        title: `Service ${n + 1}`,
        body: `<p>Body ${n + 1}.</p>`,
      })),
    },
  });
}

describe("UAT AC-431: services-grid collapses to a single column below md breakpoint", () => {
  it("test_UAT_AC431_services_grid_collapses_to_single_column_below_md", async () => {
    // Real entry-point execution: both variants render the list region the
    // responsive grid rule targets, carrying their variant marker.
    for (const { variant, items } of [
      { variant: "two-col" as const, items: 2 },
      { variant: "three-col" as const, items: 3 },
    ]) {
      const html = await renderVariant(variant, items);
      expect(
        html,
        `${variant}: rendered output carries the variant marker`,
      ).toMatch(new RegExp(`fc-services-grid--variant-${variant}`));
      expect(
        html,
        `${variant}: rendered output contains the grid list element`,
      ).toMatch(/<ul[^>]+class="[^"]*fc-services-grid__list[^"]*"/);
    }

    // Scoped-CSS collapse contract, anchored to the rendered .fc-services-grid__list.
    // Base rule (the <md state): single column.
    expect(
      source,
      "base list rule is single-column (grid-template-columns: 1fr)",
    ).toMatch(/\.fc-services-grid__list\s*\{[^}]*grid-template-columns:\s*1fr\s*;/);

    // Multi-column layout exists ONLY inside the min-width:768px media query.
    expect(source).toMatch(/@media\s*\(\s*min-width:\s*768px\s*\)/);
    const mediaBlock = sliceMediaBlock(source, "@media (min-width: 768px)");
    expect(mediaBlock.length).toBeGreaterThan(0);
    expect(mediaBlock).toMatch(/repeat\(\s*2\s*,\s*1fr\s*\)/);
    expect(mediaBlock).toMatch(/repeat\(\s*3\s*,\s*1fr\s*\)/);

    // Outside the media block, no rule sets a multi-column grid — so below md
    // the grid stays single-column for either variant.
    const sourceWithoutMediaBlock = source.replace(mediaBlock, "");
    expect(sourceWithoutMediaBlock).not.toMatch(/repeat\(\s*2\s*,\s*1fr\s*\)/);
    expect(sourceWithoutMediaBlock).not.toMatch(/repeat\(\s*3\s*,\s*1fr\s*\)/);
  });
});
