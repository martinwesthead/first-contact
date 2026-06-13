import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import TextBlock from "../packages/framework/src/modules/text-block/index.astro";

// Per the framework's existing convention (see hero.subhead),
// `markdown` content fields are pre-rendered to HTML upstream.
// The module passes the HTML through via set:html, preserving structure.
describe("UAT FC REQ-5: text-block renders markdown HTML with image and list", () => {
  it("preserves <img>, <ul>, <li> elements from the rendered markdown body", async () => {
    const renderedMarkdown =
      "<p>Intro.</p>" +
      "<ul><li>First</li><li>Second</li></ul>" +
      '<p><img src="/assets/diagram.png" alt="Diagram"></p>';

    const container = await AstroContainer.create();
    const html = await container.renderToString(TextBlock, {
      props: {
        variant: "prose",
        body: renderedMarkdown,
      },
    });

    expect(html).toMatch(/<ul>\s*<li>First<\/li>\s*<li>Second<\/li>\s*<\/ul>/);
    expect(html).toMatch(/<img[^>]+src="\/assets\/diagram\.png"/);
    expect(html).toMatch(/alt="Diagram"/);
  });
});
