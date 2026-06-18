// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearToolResultRenderers,
  registerToolResultRenderer,
  renderToolResult,
  renderMarkdownToDom,
  type ChatToolResultRecord,
} from "@1stcontact/builder-ui";

describe("UAT FC REQ-13: tool_result dispatcher routes by kind and falls back to markdown for unknown kinds", () => {
  beforeEach(() => {
    clearToolResultRenderers();
  });
  afterEach(() => {
    clearToolResultRenderers();
    document.body.innerHTML = "";
  });

  it("routes a tool_result with kind='reference_digest' to the registered renderer (stubbed here in lieu of REQ-21's component)", () => {
    const stubRenderer = vi.fn((ctx: { doc: Document }) => {
      const el = ctx.doc.createElement("div");
      el.setAttribute("data-fc-stub-digest", "true");
      el.textContent = "DIGEST RENDERED";
      return el;
    });
    registerToolResultRenderer("reference_digest", stubRenderer);

    const result: ChatToolResultRecord = {
      ok: true,
      applied: {
        tool: "summarize_reference",
        args: { url: "https://example.com" },
        summary: "summarised 3 sources",
        kind: "reference_digest",
      },
    };

    const node = renderToolResult({
      doc: document,
      result,
      renderMarkdown: (md) => renderMarkdownToDom(document, md),
    }) as HTMLElement;

    expect(stubRenderer).toHaveBeenCalledOnce();
    expect(node.getAttribute("data-fc-stub-digest")).toBe("true");
    expect(node.textContent).toBe("DIGEST RENDERED");
  });

  it("falls back to a markdown card when kind is missing or unregistered", () => {
    const result: ChatToolResultRecord = {
      ok: true,
      applied: {
        tool: "set_module_dial",
        args: { instance_id: "h", dial: "size", value: "lg" },
        summary: "set dial **size** to '`lg`' on h",
      },
    };
    const node = renderToolResult({
      doc: document,
      result,
      renderMarkdown: (md) => renderMarkdownToDom(document, md),
    }) as HTMLElement;

    // Falls back to a ChatCard wrapping the markdown summary.
    expect(node.getAttribute("data-fc-chat-card")).not.toBeNull();
    const body = node.querySelector("[data-fc-chat-card-body]")!;
    expect(body.querySelector("strong")?.textContent).toBe("size");
    expect(body.querySelector("code")?.textContent).toBe("lg");
  });

  it("renders a danger-toned ChatCard for failed tool_results", () => {
    const result: ChatToolResultRecord = {
      ok: false,
      error: {
        tool: "set_module_dial",
        validation: { message: "value 'huge' is not in [sm, md, lg]" },
      },
    };
    const node = renderToolResult({
      doc: document,
      result,
      renderMarkdown: (md) => renderMarkdownToDom(document, md),
    }) as HTMLElement;
    expect(node.getAttribute("data-fc-chat-card-tone")).toBe("danger");
    expect(node.textContent).toContain("huge");
  });
});
