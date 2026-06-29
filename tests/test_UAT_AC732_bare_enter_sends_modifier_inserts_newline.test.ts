// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { BuilderStore, createChatPanel } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

/**
 * AC-732: bare Enter sends the message; Enter with any modifier (Shift / Alt /
 * Meta / Ctrl) inserts a newline instead. The placeholder advertises the
 * contract. Bare Enter on empty input no-ops, and a bare Enter during an
 * in-flight turn does not fire a second send.
 */
describe("UAT AC-732: bare Enter sends the message; Enter with any modifier inserts a newline", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  function contentOf(panel: ReturnType<typeof createChatPanel>): HTMLElement {
    return panel.editorRoot.querySelector(
      "[data-fc-chat-editor='content']",
    ) as HTMLElement;
  }

  function dispatchEnter(
    target: HTMLElement,
    modifier?: "shift" | "ctrl" | "alt" | "meta",
  ): void {
    target.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        shiftKey: modifier === "shift",
        ctrlKey: modifier === "ctrl",
        altKey: modifier === "alt",
        metaKey: modifier === "meta",
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  it("test_UAT_AC732_bare_enter_sends_modifier_enter_newline_empty_and_inflight_noop", async () => {
    // --- Bare Enter sends --------------------------------------------------
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const onSend = vi.fn(async () => {});
    const panel = createChatPanel(document.body, { store, onSend });
    panel.setInputMarkdown("hello");

    dispatchEnter(contentOf(panel));
    await flush();
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith("hello");

    // --- Enter + each modifier does NOT send (it inserts a newline) --------
    for (const mod of ["shift", "ctrl", "alt", "meta"] as const) {
      onSend.mockClear();
      const s = new BuilderStore({
        siteDefinition: load1stContactSite(),
        chatHistory: [],
      });
      const spy = vi.fn(async () => {});
      const p = createChatPanel(document.body, { store: s, onSend: spy });
      p.setInputMarkdown("hello");
      dispatchEnter(contentOf(p), mod);
      await flush();
      expect(spy, `${mod}+Enter must not send`).not.toHaveBeenCalled();
      p.destroy();
    }

    // --- Placeholder advertises the Enter-to-send contract -----------------
    const placeholderHost = panel.editorRoot.querySelector("[data-placeholder]");
    expect(
      placeholderHost?.getAttribute("data-placeholder") ?? "",
      "placeholder advertises 'Enter to send'",
    ).toContain("Enter to send");

    // --- Bare Enter on empty input no-ops ----------------------------------
    const emptyStore = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const emptySend = vi.fn(async () => {});
    const emptyPanel = createChatPanel(document.body, {
      store: emptyStore,
      onSend: emptySend,
    });
    dispatchEnter(contentOf(emptyPanel));
    await flush();
    expect(emptySend).not.toHaveBeenCalled();

    // --- Bare Enter during an in-flight turn fires no second send ----------
    const busyStore = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const busySend = vi.fn(() => new Promise<void>(() => {}));
    const busyPanel = createChatPanel(document.body, {
      store: busyStore,
      onSend: busySend,
    });
    busyPanel.setInputMarkdown("first");
    dispatchEnter(contentOf(busyPanel));
    await flush();
    expect(busySend).toHaveBeenCalledTimes(1);
    busyPanel.setInputMarkdown("second");
    dispatchEnter(contentOf(busyPanel));
    await flush();
    expect(busySend).toHaveBeenCalledTimes(1);
  });
});
