import { describe, expect, it } from "vitest";
import { renderModuleInstance, type ResolveAsset } from "@1stcontact/framework/render";
import type { ModuleInstance } from "@1stcontact/site-schema";

function textBlock(body: unknown): ModuleInstance {
  return {
    id: "text-1",
    type: "text-block",
    version: 1,
    variant: "prose",
    content: { body },
  };
}

describe("UAT FC REQ-33 AC5/AC6/AC7/AC8: renderer markdown handling", () => {
  it("AC5: inline string starting with '<' is emitted as trusted HTML passthrough", () => {
    // Preserves the existing 1stcontact baseline where body content is inline
    // <p>...</p> — must continue to render unchanged.
    const html = renderModuleInstance(textBlock("<p>Hello <strong>world</strong></p>"));
    expect(html).toContain("<p>Hello <strong>world</strong></p>");
    // Renderer must NOT wrap the inline HTML in another <p>.
    expect(html.match(/<p>/g)?.length).toBe(1);
  });

  it("AC6: inline string starting with '#' runs through markdown-to-HTML", () => {
    const html = renderModuleInstance(textBlock("# Heading\n\nA paragraph."));
    expect(html).toContain("<h1>Heading</h1>");
    expect(html).toContain("<p>A paragraph.</p>");
  });

  it("renderer converts unordered lists and inline emphasis from markdown", () => {
    const html = renderModuleInstance(
      textBlock("- one\n- two\n\n**bold** and *italic*."),
    );
    expect(html).toContain("<ul><li>one</li><li>two</li></ul>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
  });

  it("AC7: AssetRef-text markdown field calls the resolver and uses returned markdown", () => {
    const resolveAsset: ResolveAsset = (ref) => {
      if ((ref as { kind?: string }).kind === "text") {
        return "## Resolved heading\n\nFrom R2.";
      }
      return undefined;
    };
    const html = renderModuleInstance(
      textBlock({
        kind: "text",
        id: "sites/x/copy/about.md",
        src: "sites/x/copy/about.md",
        alt: "About — fallback",
      }),
      { target: "production", resolveAsset },
    );
    expect(html).toContain("<h2>Resolved heading</h2>");
    expect(html).toContain("<p>From R2.</p>");
    // Fallback alt text must NOT appear when resolver returns content.
    expect(html).not.toContain("About — fallback");
  });

  it("AC8: AssetRef-text with no resolver emits the alt fallback", () => {
    const html = renderModuleInstance(
      textBlock({
        kind: "text",
        id: "sites/x/copy/about.md",
        src: "sites/x/copy/about.md",
        alt: "About — fallback text",
      }),
    );
    expect(html).toContain("About — fallback text");
    expect(html).not.toContain("<h2>Resolved heading</h2>");
  });

  it("AssetRef-text with no resolver and no alt emits empty body (no fallback text)", () => {
    const html = renderModuleInstance(
      textBlock({
        kind: "text",
        id: "sites/x/copy/about.md",
        src: "sites/x/copy/about.md",
      }),
    );
    expect(html).toContain('<div class="fc-text-block__body"></div>');
  });

  it("resolver throwing falls back to the alt text (does not crash)", () => {
    const resolveAsset: ResolveAsset = () => {
      throw new Error("boom");
    };
    const html = renderModuleInstance(
      textBlock({
        kind: "text",
        id: "sites/x/copy/about.md",
        src: "sites/x/copy/about.md",
        alt: "Safe fallback",
      }),
      { target: "production", resolveAsset },
    );
    expect(html).toContain("Safe fallback");
  });
});
