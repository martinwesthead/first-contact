import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import TextBlock from "../packages/framework/src/modules/text-block/index.astro";

describe("UAT FC REQ-5: text-block prose variant uses narrow container", () => {
  it("emits variant-prose class so CSS scopes width to --container-narrow", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(TextBlock, {
      props: {
        variant: "prose",
        body: "<p>Lorem.</p>",
      },
    });

    expect(html).toMatch(/fc-text-block--variant-prose/);
    expect(html).toMatch(/data-variant="prose"/);
    expect(html).not.toMatch(/fc-text-block--variant-landing/);
  });
});
