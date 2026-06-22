// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { BuilderStore, createChatPanel } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

const cmdEnter = (target: HTMLElement): void => {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Enter",
      metaKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
};

describe("UAT AC-674: repeat send during an in-flight turn fires no second onSend; empty input no-ops first", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC674_repeat_send_fires_no_second_onsend_empty_noop", async () => {
    // --- Case 1: a second send while a turn is in flight is suppressed -------
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    // onSend returns a promise that stays pending, so the first turn is still in
    // flight when we attempt the repeat sends.
    const onSend = vi.fn(() => new Promise<void>(() => {}));
    const panel = createChatPanel(document.body, { store, onSend });

    panel.setInputMarkdown("first message");
    panel.sendButton.click(); // first (and only) onSend fires here
    await flush();

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(panel.sendButton.disabled).toBe(true);

    // A second click while the turn is in flight must NOT fire onSend again.
    panel.sendButton.click();
    // Cmd/Ctrl+Enter while in flight must also be suppressed.
    cmdEnter(panel.editorRoot);
    await flush();

    expect(onSend).toHaveBeenCalledTimes(1);

    panel.destroy();

    // --- Case 2: an empty input no-ops before the busy state is entered ------
    const store2 = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const onSend2 = vi.fn(() => new Promise<void>(() => {}));
    const panel2 = createChatPanel(document.body, {
      store: store2,
      onSend: onSend2,
    });

    // Editor is empty — clicking Send must neither call onSend nor enter busy.
    panel2.sendButton.click();
    await flush();

    expect(onSend2).not.toHaveBeenCalled();
    expect(panel2.sendButton.disabled).toBe(false);
    expect(panel2.sendButton.getAttribute("aria-busy")).toBeNull();
    expect(panel2.sendButton.hasAttribute("data-fc-chat-send-busy")).toBe(false);

    panel2.destroy();
  });
});
