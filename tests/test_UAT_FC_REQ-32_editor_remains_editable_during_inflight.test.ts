// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { BuilderStore, createChatPanel } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

describe("UAT FC REQ-32: editor remains editable while a turn is in flight", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("lets the operator type their next message into the editor while the previous turn is still pending", async () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    let release: () => void = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const panel = createChatPanel(document.body, {
      store,
      onSend: () => pending,
    });

    panel.setInputMarkdown("first turn");
    panel.sendButton.click();
    await Promise.resolve();

    // Editor's content surface should still accept input — i.e. it's
    // contentEditable, has no disabled attribute, and the panel's API
    // accepts new content.
    const content = panel.editorRoot.querySelector(
      ".fc-chat__editor-content",
    ) as HTMLElement;
    expect(content).not.toBeNull();
    expect(content.getAttribute("contenteditable")).not.toBe("false");

    panel.setInputMarkdown("queued draft");
    expect(panel.getInputMarkdown()).toContain("queued draft");

    release();
    await pending;
  });
});
