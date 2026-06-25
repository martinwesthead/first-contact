import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import TextBlock from "../packages/framework/src/modules/text-block/index.astro";

// Per the framework's convention (markdown content fields are pre-rendered to HTML
// upstream — see hero.subhead), the text-block passes its body through via set:html.
// We supply rendered markdown HTML covering each feature called out in the AC and
// assert each corresponding element is present in the body region.
describe("UAT AC-427: text-block renders markdown body with headings, lists, links, images, blockquotes, and code", () => {
  it("test_UAT_AC427_text_block_renders_markdown_body_content", async () => {
    const renderedMarkdown =
      "<h3>A heading</h3>" +
      "<ul><li>First</li><li>Second</li></ul>" +
      "<ol><li>One</li></ol>" +
      '<p>See <a href="https://example.com/">example</a>.</p>' +
      '<p><img src="/assets/diagram.png" alt="Diagram"></p>' +
      "<blockquote>A quote.</blockquote>" +
      "<pre><code>const x = 1;</code></pre>";

    const container = await AstroContainer.create();
    const html = await container.renderToString(TextBlock, {
      props: {
        variant: "landing",
        body: renderedMarkdown,
      },
    });

    // Body region is present.
    expect(html).toMatch(/class="[^"]*fc-text-block__body[^"]*"/);

    // Each markdown feature surfaces as the corresponding HTML element.
    expect(html).toMatch(/<h3>\s*A heading\s*<\/h3>/);
    expect(html).toMatch(/<ul>\s*<li>First<\/li>\s*<li>Second<\/li>\s*<\/ul>/);
    expect(html).toMatch(/<ol>\s*<li>One<\/li>\s*<\/ol>/);
    expect(html).toMatch(/<a[^>]+href="https:\/\/example\.com\/"[^>]*>\s*example\s*<\/a>/);
    expect(html).toMatch(/<img[^>]+src="\/assets\/diagram\.png"/);
    expect(html).toMatch(/alt="Diagram"/);
    expect(html).toMatch(/<blockquote>\s*A quote\.\s*<\/blockquote>/);
    expect(html).toMatch(/<code>\s*const x = 1;\s*<\/code>/);
  });
});
