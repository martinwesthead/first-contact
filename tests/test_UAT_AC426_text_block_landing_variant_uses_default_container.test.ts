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

describe("UAT AC-426: text-block landing variant uses the default container width", () => {
  it("test_UAT_AC426_text_block_landing_variant_uses_default_container", async () => {
    // CSS source: landing variant scopes max-width to --container-default.
    expect(source).toMatch(
      /\.fc-text-block--variant-landing\s+\.fc-text-block__inner\s*\{[^}]*max-width:\s*var\(--container-default\)/,
    );

    // Rendered markup carries the variant marker the CSS targets.
    const container = await AstroContainer.create();
    const html = await container.renderToString(TextBlock, {
      props: {
        variant: "landing",
        body: "<p>Manifesto.</p>",
      },
    });
    expect(html).toMatch(/fc-text-block--variant-landing/);
    expect(html).toMatch(/data-variant="landing"/);
    // Distinct from the prose variant.
    expect(html).not.toMatch(/fc-text-block--variant-prose/);
  });
});
