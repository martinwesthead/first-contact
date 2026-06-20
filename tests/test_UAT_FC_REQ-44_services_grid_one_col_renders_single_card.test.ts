import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ServicesGrid from "../packages/framework/src/modules/services-grid/index.astro";

describe("UAT FC REQ-44: services-grid one-col renders a single feature callout", () => {
  it("emits a card tagged with the one-col variant", async () => {
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

    expect(html).toMatch(/data-variant="one-col"/);
    expect(html).toMatch(/fc-services-grid--variant-one-col/);

    const cards = html.match(/fc-services-grid__card/g) ?? [];
    expect(cards.length).toBe(1);

    expect(html).toMatch(/Headline service/);
    expect(html).toMatch(/One callout, full width\./);
  });
});
