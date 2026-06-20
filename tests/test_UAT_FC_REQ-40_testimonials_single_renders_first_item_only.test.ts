import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import Testimonials from "../packages/framework/src/modules/testimonials/index.astro";

describe("UAT FC REQ-40: testimonials single variant renders only the first item", () => {
  it("renders only items[0] even when multiple are provided", async () => {
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

    expect(html).toMatch(/data-variant="single"/);
    expect(html).toMatch(/fc-testimonials--variant-single/);

    const cards = html.match(/fc-testimonials__card/g) ?? [];
    expect(cards.length).toBe(1);

    expect(html).toMatch(/Alice/);
    expect(html).toMatch(/The chosen one\./);
    expect(html).not.toMatch(/Bob/);
    expect(html).not.toMatch(/Carol/);
  });
});
