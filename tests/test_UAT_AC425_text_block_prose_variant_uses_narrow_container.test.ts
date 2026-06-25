import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import TextBlock from "../packages/framework/src/modules/text-block/index.astro";

const modulePath = fileURLToPath(
  new URL(
    "../packages/framework/src/modules/text-block/index.astro",
    import.meta.url,
  ),
);
const source = readFileSync(modulePath, "utf8");

describe("UAT AC-425: text-block prose variant constrains body width to the narrow container", () => {
  it("test_UAT_AC425_text_block_prose_variant_uses_narrow_container", async () => {
    // CSS source: prose variant scopes max-width to --container-narrow.
    expect(source).toMatch(
      /\.fc-text-block--variant-prose\s+\.fc-text-block__inner\s*\{[^}]*max-width:\s*var\(--container-narrow\)/,
    );

    // Rendered markup carries the variant marker the CSS targets.
    const container = await AstroContainer.create();
    const html = await container.renderToString(TextBlock, {
      props: {
        variant: "prose",
        body: "<p>Lorem.</p>",
      },
    });
    expect(html).toMatch(/fc-text-block--variant-prose/);
    expect(html).toMatch(/data-variant="prose"/);
    // Distinct from the landing variant.
    expect(html).not.toMatch(/fc-text-block--variant-landing/);
  });
});
