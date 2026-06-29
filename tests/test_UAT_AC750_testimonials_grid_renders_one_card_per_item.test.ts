import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import Testimonials from "../packages/framework/src/modules/testimonials/index.astro";

// AC-750: the grid variant renders exactly one card per supplied item, tags the
// section data-variant="grid", surfaces every attribution name, and presents a
// static grid (no carousel/rotation behavior).
describe("UAT AC-750: grid variant renders one card per item and tags the section data-variant=grid", () => {
  it("test_UAT_AC750_testimonials_grid_renders_one_card_per_item", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Testimonials, {
      props: {
        variant: "grid",
        items: [
          { quote: "<p>Quote one.</p>", name: "Alice" },
          { quote: "<p>Quote two.</p>", name: "Bob" },
          { quote: "<p>Quote three.</p>", name: "Carol" },
        ],
      },
    });

    // The section is identifiable as the grid variant.
    expect(html).toMatch(/data-variant="grid"/);
    expect(html).toMatch(/fc-testimonials--variant-grid/);

    // Exactly one card per supplied item (N = 3).
    const cards = html.match(/fc-testimonials__card/g) ?? [];
    expect(cards.length).toBe(3);

    // Every attribution name appears.
    expect(html).toMatch(/Alice/);
    expect(html).toMatch(/Bob/);
    expect(html).toMatch(/Carol/);
  });
});
