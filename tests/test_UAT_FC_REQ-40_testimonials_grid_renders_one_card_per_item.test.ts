import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import Testimonials from "../packages/framework/src/modules/testimonials/index.astro";

describe("UAT FC REQ-40: testimonials grid renders one card per item", () => {
  it("emits a card per item and tags the section with data-variant='grid'", async () => {
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

    expect(html).toMatch(/data-variant="grid"/);
    expect(html).toMatch(/fc-testimonials--variant-grid/);

    const cards = html.match(/fc-testimonials__card/g) ?? [];
    expect(cards.length).toBe(3);

    expect(html).toMatch(/Alice/);
    expect(html).toMatch(/Bob/);
    expect(html).toMatch(/Carol/);
  });
});
