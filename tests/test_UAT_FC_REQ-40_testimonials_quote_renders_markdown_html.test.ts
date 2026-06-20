import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import Testimonials from "../packages/framework/src/modules/testimonials/index.astro";

describe("UAT FC REQ-40: testimonials quote renders markdown as HTML", () => {
  it("emits the quote body as parsed HTML (not escaped)", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Testimonials, {
      props: {
        variant: "single",
        items: [
          {
            quote: "<p>Best <strong>experience</strong> ever.</p>",
            name: "Alice",
          },
        ],
      },
    });
    expect(html).toMatch(/<strong>experience<\/strong>/);
    expect(html).not.toMatch(/&lt;strong&gt;/);
  });
});
