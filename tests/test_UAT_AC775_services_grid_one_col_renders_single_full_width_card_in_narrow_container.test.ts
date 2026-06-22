import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { MODULE_CSS } from "@gendev/framework";
import ServicesGrid from "../packages/framework/src/modules/services-grid/index.astro";

// The one-col variant presents a single full-width feature-callout card. The
// section is tagged data-variant="one-col" and a one-col variant modifier class,
// and its single column is constrained to the framework's narrow content
// container rather than the default grid width.
//
// Tagging + the single card are proven from the real component render. The
// narrow-container + single-column layout contract is the framework's exported
// MODULE_CSS rule that governs the static render of the one-col variant.

describe("UAT AC-775: services-grid one-col renders a single full-width card in the narrow container", () => {
  it("test_UAT_AC775_services_grid_one_col_renders_single_full_width_card_in_narrow_container", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ServicesGrid, {
      props: {
        variant: "one-col",
        items: [
          {
            heading: "Headline service",
            body: "<p>One callout, full width.</p>",
          },
        ],
      },
    });

    // Section is tagged with the one-col variant (data attribute + modifier class).
    expect(html).toMatch(/data-variant="one-col"/);
    expect(html).toMatch(/fc-services-grid--variant-one-col/);

    // Exactly one feature-callout card is rendered, carrying the item content.
    const cards = html.match(/fc-services-grid__card/g) ?? [];
    expect(cards.length).toBe(1);
    expect(html).toMatch(/Headline service/);
    expect(html).toMatch(/One callout, full width\./);

    // Layout contract: the one-col variant lays items out in a single full-width
    // column constrained to the narrow container (not the default grid width).
    const oneColRuleMatch =
      /\.fc-services-grid--variant-one-col\s+\.fc-services-grid__items\s*\{[^}]*\}/.exec(
        MODULE_CSS,
      );
    expect(oneColRuleMatch, "one-col layout rule present in MODULE_CSS").not.toBeNull();
    const oneColRule = oneColRuleMatch![0];
    // Single full-width column.
    expect(oneColRule).toMatch(/grid-template-columns:\s*minmax\(\s*0\s*,\s*1fr\s*\)/);
    // Constrained to the narrow container, not the default container width.
    expect(oneColRule).toMatch(/max-width:\s*var\(--container-narrow\)/);
  });
});
