// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { BuilderStore, createChatPanel } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

/**
 * AC-582: the chat input is a markdown-aware rich-text editor (not a plain
 * <textarea>). Pasting markdown renders formatted; sending (via the round
 * Send button) serializes the editor content back to a markdown string —
 * that markdown is the /api/chat payload. The editor clears after a
 * successful send and empty submissions are ignored.
 */
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

    // The serialized content is markdown, not HTML.
    const md = panel.getInputMarkdown();
    expect(md).toContain("# Title");
    expect(md).toContain("**bold**");
    expect(md).not.toContain("<h1>");
    expect(md).not.toContain("<strong>");

    // Sending via the round Send button delivers the markdown string.
    panel.sendButton.click();
    await flush();
    expect(onSend).toHaveBeenCalledTimes(1);
    const sent = onSend.mock.calls[0]![0];
    expect(sent).toContain("# Title");
    expect(sent).toContain("**bold**");
    expect(sent).not.toContain("<h1>");

    // The editor clears after a successful send.
    expect(panel.getInputMarkdown()).toBe("");

    // Empty submissions are ignored — onSend is not invoked again.
    panel.sendButton.click();
    await flush();
    expect(onSend).toHaveBeenCalledTimes(1);
  });
});
