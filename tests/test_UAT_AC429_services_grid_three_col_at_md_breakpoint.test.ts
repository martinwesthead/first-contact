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

describe("UAT AC-429: services-grid three-col variant renders three columns at md+", () => {
  it("test_UAT_AC429_services_grid_three_col_at_md_breakpoint", async () => {
    // CSS source: at >=768px, three-col variant uses repeat(3, 1fr).
    expect(source).toMatch(
      /@media\s*\(\s*min-width:\s*768px\s*\)[\s\S]*?\.fc-services-grid--variant-three-col[\s\S]*?grid-template-columns:\s*repeat\(\s*3\s*,\s*1fr\s*\)/,
    );

    // Rendered markup carries the three-col variant marker.
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
    expect(html).toMatch(/fc-services-grid--variant-three-col/);

    const cards = html.match(/fc-services-grid__card/g) ?? [];
    expect(cards.length).toBe(3);
  });
});
