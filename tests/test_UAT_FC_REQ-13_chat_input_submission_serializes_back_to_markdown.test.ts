// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BuilderStore,
  createChatPanel,
} from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

describe("UAT FC REQ-13: chat input submission serializes back to markdown (not HTML) for the /api/chat call", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("sends the editor content as markdown when the operator hits the send button — headings/bold survive the round-trip as markdown syntax", async () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const onSend = vi.fn(async (_text: string) => {});
    const panel = createChatPanel(document.body, {
      store,
      onSend,
    });

    panel.setInputMarkdown("# Title\n\n**bold**");

    // Read back what the panel would submit.
    const markdown = panel.getInputMarkdown();
    expect(markdown).toContain("# Title");
    expect(markdown).toContain("**bold**");
    // Crucially: no HTML tags in the submitted string.
    expect(markdown).not.toContain("<h1>");
    expect(markdown).not.toContain("<strong>");

    // Drive the send button and confirm onSend was called with the markdown.
    panel.sendButton.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(onSend).toHaveBeenCalledTimes(1);
    const sent = onSend.mock.calls[0]![0] as string;
    expect(sent).toContain("# Title");
    expect(sent).toContain("**bold**");
    expect(sent).not.toContain("<h1>");
  });
});
