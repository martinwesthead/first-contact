// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearToolResultRenderers,
  registerToolResultRenderer,
  renderToolResult,
  renderMarkdownToDom,
  type ChatToolResultRecord,
} from "@1stcontact/builder-ui";

describe("UAT AC-584: tool_result kind to renderer dispatcher with markdown fallback and danger card on failure", () => {
  beforeEach(() => {
    clearToolResultRenderers();
  });
  afterEach(() => {
    clearToolResultRenderers();
    document.body.innerHTML = "";
  });

  it("test_UAT_AC584_tool_result_dispatcher_routes_kind_fallback_and_danger", () => {
    const dispatch = (result: ChatToolResultRecord): HTMLElement =>
      renderToolResult({
        doc: document,
        result,
        renderMarkdown: (md) => renderMarkdownToDom(document, md),
      }) as HTMLElement;

    // 1. A result tagged with a registered kind is rendered by that renderer.
    const stub = vi.fn((ctx: { doc: Document }) => {
      const el = ctx.doc.createElement("div");
      el.setAttribute("data-fc-stub", "true");
      el.textContent = "ROUTED";
      return el;
    });
    registerToolResultRenderer("test_kind", stub);
    const routed = dispatch({
      ok: true,
      applied: { tool: "t", args: {}, summary: "s", kind: "test_kind" },
    });
    expect(stub).toHaveBeenCalledOnce();
    expect(routed.getAttribute("data-fc-stub")).toBe("true");
    expect(routed.textContent).toBe("ROUTED");

    // 2. A successful result with no kind falls back to a card whose body is
    //    the summary rendered as markdown.
    const noKind = dispatch({
      ok: true,
      applied: { tool: "set_module_dial", args: {}, summary: "set **size** to `lg`" },
    });
    expect(noKind.getAttribute("data-fc-chat-card")).not.toBeNull();
    expect(
      noKind.querySelector("[data-fc-chat-card-body] strong")?.textContent,
    ).toBe("size");

    // 3. An unregistered kind does not throw and uses the same markdown fallback.
    let unknown!: HTMLElement;
    expect(() => {
      unknown = dispatch({
        ok: true,
        applied: { tool: "t", args: {}, summary: "plain **summary**", kind: "no_such_kind" },
      });
    }).not.toThrow();
    expect(unknown.getAttribute("data-fc-chat-card")).not.toBeNull();
    expect(
      unknown.querySelector("[data-fc-chat-card-body] strong")?.textContent,
    ).toBe("summary");

    // 4. A failed result renders as a danger-toned card surfacing the message.
    const failed = dispatch({
      ok: false,
      error: {
        tool: "set_module_dial",
        validation: { message: "value 'huge' is not in [sm, md, lg]" },
      },
    });
    expect(failed.getAttribute("data-fc-chat-card-tone")).toBe("danger");
    expect(failed.textContent).toContain("huge");
  });
});
