import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import TextBlock from "../packages/framework/src/modules/text-block/index.astro";

describe("UAT FC REQ-5: text-block omits heading when not provided", () => {
  it("does not emit an h2 element when heading is absent", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(TextBlock, {
      props: {
        variant: "prose",
        body: "<p>Body only.</p>",
      },
    });

    expect(html).not.toMatch(/<h2\b/);
    expect(html).not.toMatch(/fc-text-block__heading/);
    expect(html).toMatch(/Body only\./);
  });

  it("emits an h2 with the heading text when provided", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(TextBlock, {
      props: {
        variant: "prose",
        heading: "Our Manifesto",
        body: "<p>Body.</p>",
      },
    });

    expect(html).toMatch(/<h2[^>]*class="[^"]*fc-text-block__heading[^"]*"[^>]*>\s*Our Manifesto\s*<\/h2>/);
  });
});
