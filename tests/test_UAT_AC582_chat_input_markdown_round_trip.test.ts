// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { BuilderStore, createChatPanel } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

describe("UAT AC-582: chat input is a markdown-aware rich-text editor with markdown round-trip on send", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC582_chat_input_markdown_round_trip_on_send", async () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const onSend = vi.fn(async (_text: string) => {});
    const panel = createChatPanel(document.body, { store, onSend });

    // Pasting markdown renders as formatted text — heading and bold display
    // with their formatting, not as literal #/** characters.
    panel.setInputMarkdown("# Title\n\n**bold**");
    const editorContent = panel.editorRoot.querySelector(
      '[data-fc-chat-editor="content"]',
    )!;
    expect(editorContent.querySelector("h1")?.textContent).toBe("Title");
    expect(editorContent.querySelector("strong")?.textContent).toBe("bold");

    // On submission the editor serializes back to markdown — the payload is a
    // markdown string, not HTML.
    const md = panel.getInputMarkdown();
    expect(md).toContain("# Title");
    expect(md).toContain("**bold**");
    expect(md).not.toContain("<h1>");
    expect(md).not.toContain("<strong>");

    // Cmd/Ctrl+Enter sends, and onSend receives the markdown string.
    panel.editorRoot.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        metaKey: true,
        bubbles: true,
      }),
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(onSend).toHaveBeenCalledTimes(1);
    const sent = onSend.mock.calls[0]![0];
    expect(sent).toContain("# Title");
    expect(sent).toContain("**bold**");
    expect(sent).not.toContain("<h1>");

    // The editor clears after a successful send.
    expect(panel.getInputMarkdown()).toBe("");

    // Empty submissions are ignored — onSend is not invoked again.
    panel.editorRoot.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        metaKey: true,
        bubbles: true,
      }),
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(onSend).toHaveBeenCalledTimes(1);
  });
});
