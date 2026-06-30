// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { htmlToMarkdown } from "../packages/builder-ui/src/components/assets-tab.js";

describe("UAT FC REQ-16: htmlToMarkdown serializes TipTap HTML back to markdown", () => {
  it("converts headings, inline emphasis, and both list kinds", () => {
    const html =
      "<h1>Title</h1>" +
      "<p>Some <strong>bold</strong> and <em>italic</em> text.</p>" +
      "<ul><li>one</li><li>two</li></ul>" +
      "<ol><li>first</li><li>second</li></ol>";

    expect(htmlToMarkdown(html, document)).toBe(
      [
        "# Title",
        "",
        "Some **bold** and _italic_ text.",
        "",
        "- one",
        "- two",
        "",
        "1. first",
        "2. second",
      ].join("\n"),
    );
  });

  it("converts blockquotes, inline code, and horizontal rules", () => {
    const html =
      "<blockquote>quoted</blockquote>" +
      "<p>call <code>fn()</code> now</p>" +
      "<hr>" +
      "<p>after</p>";

    expect(htmlToMarkdown(html, document)).toBe(
      ["> quoted", "", "call `fn()` now", "", "---", "", "after"].join("\n"),
    );
  });
});
