import { describe, expect, it } from "vitest";
import {
  htmlToMarkdown,
  rewriteMarkdownImageRefs,
} from "../packages/extractor/src/index.js";

describe("UAT FC REQ-33 AC8/AC9: htmlToMarkdown produces the markdown subset the renderer accepts", () => {
  it("AC9: converts h1 + paragraph + bold to canonical markdown", () => {
    const md = htmlToMarkdown("<h1>Hi</h1><p>Body <strong>bold</strong></p>");
    expect(md).toContain("# Hi");
    expect(md).toContain("Body **bold**");
  });

  it("preserves italic, links, inline code", () => {
    const md = htmlToMarkdown(
      `<p><em>italic</em> + <a href="https://x.test">link</a> + <code>code</code>.</p>`,
    );
    expect(md).toContain("*italic*");
    expect(md).toContain("[link](https://x.test)");
    expect(md).toContain("`code`");
  });

  it("converts ordered + unordered lists", () => {
    const md = htmlToMarkdown(
      "<ul><li>a</li><li>b</li></ul><ol><li>one</li><li>two</li></ol>",
    );
    expect(md).toContain("- a\n- b");
    expect(md).toContain("1. one\n2. two");
  });

  it("converts blockquotes", () => {
    const md = htmlToMarkdown("<blockquote>important note</blockquote>");
    expect(md).toContain("> important note");
  });

  it("preserves img references (alt + src) for later URL rewriting", () => {
    const md = htmlToMarkdown(`<p><img src="https://x.test/cat.png" alt="A cat" /></p>`);
    expect(md).toContain("![A cat](https://x.test/cat.png)");
  });

  it("drops scripts, styles, and CSS classes silently", () => {
    const md = htmlToMarkdown(
      `<style>.x { color: red }</style><script>alert(1)</script><p class="ignore-me">survive</p>`,
    );
    expect(md).toContain("survive");
    expect(md).not.toContain("ignore-me");
    expect(md).not.toContain("alert");
    expect(md).not.toContain("color: red");
  });

  it("rewriteMarkdownImageRefs replaces mapped URLs with R2-keyed paths", () => {
    const md = "![A cat](https://x.test/cat.png)\n\n![Untouched](https://y.test/other.png)";
    const urlToR2Key = new Map<string, string>([
      ["https://x.test/cat.png", "uploads/abc123/cat.png"],
    ]);
    const out = rewriteMarkdownImageRefs(md, urlToR2Key);
    expect(out).toContain("![A cat](/assets/uploads/abc123/cat.png)");
    expect(out).toContain("![Untouched](https://y.test/other.png)");
  });
});
