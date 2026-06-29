import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import Testimonials from "../packages/framework/src/modules/testimonials/index.astro";

// AC-751: the single variant renders only the first supplied item and suppresses
// every later item. The section is tagged data-variant="single" and produces
// exactly one card; the first item's quote and name appear, later names do not.
describe("UAT AC-751: single variant renders only the first item regardless of how many are supplied", () => {
  it("test_UAT_AC751_testimonials_single_renders_first_item_only", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Testimonials, {
      props: {
        variant: "single",
        items: [
          { quote: "<p>The chosen one.</p>", name: "Alice" },
          { quote: "<p>Hidden two.</p>", name: "Bob" },
          { quote: "<p>Hidden three.</p>", name: "Carol" },
        ],
      },
    });

    // The section is identifiable as the single variant.
    expect(html).toMatch(/data-variant="single"/);
    expect(html).toMatch(/fc-testimonials--variant-single/);

    // Exactly one card is emitted.
    const cards = html.match(/fc-testimonials__card/g) ?? [];
    expect(cards.length).toBe(1);

    // The first item's quote and name appear.
    expect(html).toMatch(/The chosen one\./);
    expect(html).toMatch(/Alice/);

    // The second and third items' names are absent.
    expect(html).not.toMatch(/Bob/);
    expect(html).not.toMatch(/Carol/);
  });
});
