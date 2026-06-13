import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import TextBlock from "../packages/framework/src/modules/text-block/index.astro";

describe("UAT FC REQ-5: text-block landing variant uses default container", () => {
  it("emits variant-landing class so CSS scopes width to --container-default", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(TextBlock, {
      props: {
        variant: "landing",
        body: "<p>Manifesto.</p>",
      },
    });

    expect(html).toMatch(/fc-text-block--variant-landing/);
    expect(html).toMatch(/data-variant="landing"/);
    expect(html).not.toMatch(/fc-text-block--variant-prose/);
  });
});
