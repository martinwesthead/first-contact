// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { BuilderStore, createChatPanel } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("UAT AC-675: chat editor stays editable while a turn is in flight", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC675_chat_editor_stays_editable_while_in_flight", async () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    // onSend stays pending so the panel remains in its busy/in-flight state.
    const panel = createChatPanel(document.body, {
      store,
      onSend: () => new Promise<void>(() => {}),
    });

    panel.setInputMarkdown("kick off a long turn");
    panel.sendButton.click();
    await flush();

    // Send button is locked while the turn is in flight...
    expect(panel.sendButton.disabled).toBe(true);

    // ...but the editor surface is NOT disabled — it stays a live, editable
    // contenteditable region so the operator can compose the next message.
    const content = panel.editorRoot.querySelector<HTMLElement>(
      '[data-fc-chat-editor="content"]',
    );
    expect(content, "editor content surface must exist").not.toBeNull();
    // contenteditable is anything but "false" (ProseMirror sets it to "true").
    expect(content!.getAttribute("contenteditable")).not.toBe("false");
    expect(panel.editorRoot.hasAttribute("disabled")).toBe(false);
    expect(content!.hasAttribute("disabled")).toBe(false);

    // The editor accepts focus and typed input mid-flight: setting new content
    // round-trips back through getInputMarkdown while the turn is still running.
    content!.focus();
    panel.setInputMarkdown("next message while busy");
    expect(panel.getInputMarkdown()).toContain("next message while busy");

    // And the Send button is still locked the whole time the editor was used.
    expect(panel.sendButton.disabled).toBe(true);

    panel.destroy();
  });
});
