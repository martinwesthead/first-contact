// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { BuilderStore, createChatPanel } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

/**
 * REQ-36 G8: keyboard contract — bare Enter sends; Shift/Alt/Meta/Ctrl+Enter
 * inserts a newline (TipTap default). The XGD chat advertises this in its
 * placeholder ("Enter to send, Shift+Enter for newline").
 *
 * The chat panel mounts TipTap with handleKeyDown that returns true to
 * intercept bare Enter. We exercise it via the TipTap-mounted editor's
 * keydown event so the ProseMirror path actually fires.
 */
describe("UAT FC REQ-36: bare Enter submits, modifier+Enter does not", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  function dispatchEnterOn(target: HTMLElement, modifier?: "shift" | "ctrl" | "alt" | "meta"): boolean {
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      shiftKey: modifier === "shift",
      ctrlKey: modifier === "ctrl",
      altKey: modifier === "alt",
      metaKey: modifier === "meta",
      bubbles: true,
      cancelable: true,
    });
    return target.dispatchEvent(event);
  }

  it("bare Enter on the TipTap content area fires onSend (G8 contract)", async () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const onSend = vi.fn(async () => {});
    const panel = createChatPanel(document.body, { store, onSend });
    panel.setInputMarkdown("hello");

    const content = panel.editorRoot.querySelector(
      "[data-fc-chat-editor='content']",
    ) as HTMLElement;
    expect(content).not.toBeNull();

    dispatchEnterOn(content);
    // Wait for the submit microtask.
    await Promise.resolve();
    await Promise.resolve();

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith("hello");
  });

  it("Shift+Enter does NOT fire onSend (modifier means newline)", async () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const onSend = vi.fn(async () => {});
    const panel = createChatPanel(document.body, { store, onSend });
    panel.setInputMarkdown("hello");

    const content = panel.editorRoot.querySelector(
      "[data-fc-chat-editor='content']",
    ) as HTMLElement;

    dispatchEnterOn(content, "shift");
    await Promise.resolve();
    expect(onSend).not.toHaveBeenCalled();
  });

  it("Meta+Enter does NOT fire onSend (was the legacy submit shortcut; now a newline)", async () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const onSend = vi.fn(async () => {});
    const panel = createChatPanel(document.body, { store, onSend });
    panel.setInputMarkdown("hello");

    const content = panel.editorRoot.querySelector(
      "[data-fc-chat-editor='content']",
    ) as HTMLElement;

    dispatchEnterOn(content, "meta");
    await Promise.resolve();
    expect(onSend).not.toHaveBeenCalled();
  });

  it("Alt+Enter does NOT fire onSend (newline modifier)", async () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const onSend = vi.fn(async () => {});
    const panel = createChatPanel(document.body, { store, onSend });
    panel.setInputMarkdown("hello");

    const content = panel.editorRoot.querySelector(
      "[data-fc-chat-editor='content']",
    ) as HTMLElement;

    dispatchEnterOn(content, "alt");
    await Promise.resolve();
    expect(onSend).not.toHaveBeenCalled();
  });
});
