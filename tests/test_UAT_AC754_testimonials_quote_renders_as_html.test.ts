import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { bakeModuleContentForRender } from "@gendev/framework";
import type { ModuleInstance } from "@gendev/site-schema";
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

  // Bake path: the static generator bakes `items[].quote` from raw markdown to
  // HTML (it is declared `markdown` in the meta). This exercises the
  // markdown→HTML conversion the renderer relies on — not the `set:html`
  // passthrough proven above — and guards against `testimonials` going missing
  // from the render layer's markdown metadata map.
  it("test_UAT_AC754_testimonials_quote_baked_from_markdown_to_html", () => {
    const instance: ModuleInstance = {
      id: "t1",
      type: "testimonials",
      version: 1,
      variant: "single",
      content: {
        items: [{ quote: "Best **experience** ever.", name: "Alice" }],
      },
    };

    const baked = bakeModuleContentForRender(instance) as Record<string, unknown>;
    const items = baked.items as Array<Record<string, unknown>>;
    const bakedQuote = items[0].quote as string;

    // Raw markdown is converted to HTML, not passed through verbatim.
    expect(bakedQuote).toContain("<strong>experience</strong>");
    expect(bakedQuote).not.toContain("**experience**");
  });
});
