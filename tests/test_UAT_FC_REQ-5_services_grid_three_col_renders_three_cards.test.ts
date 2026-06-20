import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ServicesGrid from "../packages/framework/src/modules/services-grid/index.astro";

describe("UAT FC REQ-5: services-grid three-col renders three cards", () => {
  it("emits a card article per item and tags the section three-col", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ServicesGrid, {
      props: {
        variant: "three-col",
        items: [
          { heading: "Discover", body: "<p>One.</p>" },
          { heading: "Design", body: "<p>Two.</p>" },
          { heading: "Deliver", body: "<p>Three.</p>" },
        ],
      },
    });

    expect(html).toMatch(/data-variant="three-col"/);
    expect(html).toMatch(/fc-services-grid--variant-three-col/);

    const cards = html.match(/fc-services-grid__card/g) ?? [];
    expect(cards.length).toBe(3);

    expect(html).toMatch(/Discover/);
    expect(html).toMatch(/Design/);
    expect(html).toMatch(/Deliver/);
  });
});
