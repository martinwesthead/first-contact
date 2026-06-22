// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  BuilderStore,
  createChatPanel,
} from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

describe("UAT FC REQ-13: pasting markdown into the chat input renders as formatted text in the TipTap editor", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("setting markdown via setInputMarkdown renders heading and bold formatting inside the editor (TipTap markdown extension parses on input/paste)", () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const panel = createChatPanel(document.body, {
      store,
      onSend: async () => {},
    });

    // setInputMarkdown is the programmatic equivalent of pasting markdown into
    // the editor — tiptap-markdown's transformPastedText routes through the
    // same Markdown.parse pipeline.
    panel.setInputMarkdown("# Title\n\n**bold text**");

    const editorContent = panel.editorRoot.querySelector(
      '[data-fc-chat-editor="content"]',
    );
    expect(editorContent).not.toBeNull();
    const h1 = editorContent!.querySelector("h1");
    expect(h1?.textContent).toBe("Title");
    const strong = editorContent!.querySelector("strong");
    expect(strong?.textContent).toBe("bold text");
  });
});
