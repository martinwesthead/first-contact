import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import Testimonials from "../packages/framework/src/modules/testimonials/index.astro";

// AC-754: an item's quote is rendered as live HTML markup, not escaped text.
// Inline formatting present in the quote appears as the corresponding HTML
// element, and its escaped textual equivalent does not appear.
describe("UAT AC-754: quote content renders as HTML rather than escaped text", () => {
  it("test_UAT_AC754_testimonials_quote_renders_as_html", async () => {
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

    // The inline formatting appears as a live HTML element.
    expect(html).toMatch(/<strong>experience<\/strong>/);

    // The escaped textual equivalent does not appear.
    expect(html).not.toMatch(/&lt;strong&gt;/);
  });
});
