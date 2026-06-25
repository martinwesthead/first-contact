import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import TextBlock from "../packages/framework/src/modules/text-block/index.astro";

describe("UAT AC-428: text-block omits the heading element when no heading is provided", () => {
  it("test_UAT_AC428_text_block_omits_heading_when_absent", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(TextBlock, {
      props: {
        variant: "prose",
        body: "<p>Body only.</p>",
      },
    });

    // No heading element in the heading slot.
    expect(html).not.toMatch(/<h2\b/);
    expect(html).not.toMatch(/fc-text-block__heading/);
    // Body still renders.
    expect(html).toMatch(/Body only\./);
  });
});
