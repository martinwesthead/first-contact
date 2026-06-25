import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ServicesGrid from "../packages/framework/src/modules/services-grid/index.astro";

// Astro's container renderer doesn't ship scoped <style> blocks, so we
// verify the media-query rule against the source file and verify the
// rendered DOM carries the variant marker that the media-query CSS targets.
const modulePath = fileURLToPath(
  new URL(
    "../packages/framework/src/modules/services-grid/index.astro",
    import.meta.url,
  ),
);
const source = readFileSync(modulePath, "utf8");

describe("UAT AC-430: services-grid two-col variant renders two columns at md+", () => {
  it("test_UAT_AC430_services_grid_two_col_at_md_breakpoint", async () => {
    // CSS source: at >=768px, two-col variant uses repeat(2, 1fr).
    expect(source).toMatch(
      /@media\s*\(\s*min-width:\s*768px\s*\)[\s\S]*?\.fc-services-grid--variant-two-col[\s\S]*?grid-template-columns:\s*repeat\(\s*2\s*,\s*1fr\s*\)/,
    );

    // Rendered markup carries the two-col variant marker so the media-query CSS targets it.
    const container = await AstroContainer.create();
    const html = await container.renderToString(ServicesGrid, {
      props: {
        variant: "two-col",
        items: [
          { title: "Consulting", body: "<p>Advisory work.</p>" },
          { title: "Implementation", body: "<p>Build work.</p>" },
        ],
      },
    });
    expect(html).toMatch(/data-variant="two-col"/);
    expect(html).toMatch(/fc-services-grid--variant-two-col/);

    // The rendered card count matches the supplied items.
    const cards = html.match(/fc-services-grid__card/g) ?? [];
    expect(cards.length).toBe(2);
  });
});
