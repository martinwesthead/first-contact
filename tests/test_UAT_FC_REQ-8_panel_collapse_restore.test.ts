// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createBuilderLayout } from "@gendev/builder-ui/layout";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";

describe("UAT FC REQ-8: chat panel collapses and restores", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("collapses to a 32px restore bar and restores to the remembered width across reload", () => {
    const storage = new MemoryStorage();
    const parent = document.body;

    const first = createBuilderLayout(parent, {
      storage,
      initialChatWidthPx: 420,
      collapsedBarWidthPx: 32,
    });

    // Initial state: expanded at 420px.
    expect(first.chatPanel.style.display).toBe("");
    expect(first.chatPanel.style.width).toBe("420px");
    expect(first.restoreBar.style.display).toBe("none");

    // User clicks the collapse chevron.
    first.collapseButton.click();
    expect(first.chatPanel.style.display).toBe("none");
    expect(first.splitter.style.display).toBe("none");
    expect(first.restoreBar.style.display).toBe("");
    expect(first.restoreBar.style.width).toBe("32px");
    expect(first.getPanelState().collapsed).toBe(true);
    expect(first.getPanelState().chatWidthPx).toBe(420);
    first.destroy();

    // Simulate reload: instantiate again against the same storage.
    const second = createBuilderLayout(parent, { storage });
    // Persisted state: collapsed, width 420.
    expect(second.getPanelState()).toEqual({
      chatWidthPx: 420,
      collapsed: true,
    });
    expect(second.chatPanel.style.display).toBe("none");
    expect(second.restoreBar.style.display).toBe("");

    // User clicks the restore chevron — chat returns at remembered 420px.
    second.restoreBar.click();
    expect(second.chatPanel.style.display).toBe("");
    expect(second.chatPanel.style.width).toBe("420px");
    expect(second.getPanelState()).toEqual({
      chatWidthPx: 420,
      collapsed: false,
    });
  });
});
