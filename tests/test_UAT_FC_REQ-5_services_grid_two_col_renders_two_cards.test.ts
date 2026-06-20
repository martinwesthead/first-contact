import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ServicesGrid from "../packages/framework/src/modules/services-grid/index.astro";

describe("UAT FC REQ-5: services-grid two-col renders two cards", () => {
  it("emits one card per item and tags the section two-col", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ServicesGrid, {
      props: {
        variant: "two-col",
        items: [
          { heading: "Consulting", body: "<p>Advisory work.</p>" },
          { heading: "Implementation", body: "<p>Build work.</p>" },
        ],
      },
    });

    expect(html).toMatch(/data-variant="two-col"/);
    expect(html).toMatch(/fc-services-grid--variant-two-col/);

    const cards = html.match(/fc-services-grid__card/g) ?? [];
    expect(cards.length).toBe(2);
  });
});
