import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ServicesGrid from "../packages/framework/src/modules/services-grid/index.astro";

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

describe("UAT AC-429: services-grid three-col variant renders three columns at md+", () => {
  it("test_UAT_AC429_services_grid_three_col_at_md_breakpoint", async () => {
    // Real entry-point execution: the three-col variant renders the list and
    // carries the variant marker that the responsive CSS targets.
    const container = await AstroContainer.create();
    const html = await container.renderToString(ServicesGrid, {
      props: {
        variant: "three-col",
        items: [
          { title: "Discover", body: "<p>One.</p>" },
          { title: "Design", body: "<p>Two.</p>" },
          { title: "Deliver", body: "<p>Three.</p>" },
        ],
      },
    });
    expect(html).toMatch(/data-variant="three-col"/);
    const listMatch = /<ul[^>]+class="([^"]*fc-services-grid__list[^"]*)"/.exec(
      html,
    );
    expect(listMatch, "rendered output contains the grid list element").not.toBeNull();
    // The variant marker that scopes the column rule is on the rendered root.
    expect(html).toMatch(/fc-services-grid--variant-three-col/);

    // Column behaviour (the AC's actual claim) is proven from the scoped CSS,
    // anchored to the rendered variant class — three columns ONLY at >=768px.
    const mediaBlock = sliceMediaBlock(source, "@media (min-width: 768px)");
    expect(mediaBlock.length, "min-width:768px media query exists").toBeGreaterThan(0);
    // Inside the md media query, the three-col variant resolves to three equal columns.
    expect(mediaBlock).toMatch(
      /\.fc-services-grid--variant-three-col\s+\.fc-services-grid__list\s*\{[^}]*grid-template-columns:\s*repeat\(\s*3\s*,\s*1fr\s*\)/,
    );

    // Below md the same list is single-column: no three-col rule outside the media query.
    const baseCss = source.replace(mediaBlock, "");
    expect(baseCss).not.toMatch(/repeat\(\s*3\s*,\s*1fr\s*\)/);
    expect(baseCss).toMatch(
      /\.fc-services-grid__list\s*\{[^}]*grid-template-columns:\s*1fr\s*;/,
    );
  });
});
