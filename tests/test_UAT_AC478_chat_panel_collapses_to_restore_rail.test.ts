// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createBuilderLayout } from "@1stcontact/builder-ui/layout";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";

describe("UAT AC-478: chat panel collapses to a 32px restore rail and restores remembered width across reload", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC478_chat_panel_collapses_restores_and_persists_state", () => {
    const storage = new MemoryStorage();
    const parent = document.body;

    // First mount: chat visible at 420px, restore rail hidden.
    const first = createBuilderLayout(parent, {
      storage,
      initialChatWidthPx: 420,
      collapsedBarWidthPx: 32,
    });

    expect(first.chatPanel.style.display).toBe("");
    expect(first.chatPanel.style.width).toBe("420px");
    expect(first.restoreBar.style.display).toBe("none");

    // Click the collapse control. Panel + splitter hide; restore rail appears at 32px;
    // persisted state records collapsed=true with chatWidthPx=420.
    first.collapseButton.click();
    expect(first.chatPanel.style.display).toBe("none");
    expect(first.splitter.style.display).toBe("none");
    expect(first.restoreBar.style.display).toBe("");
    expect(first.restoreBar.style.width).toBe("32px");
    expect(first.getPanelState()).toEqual({
      chatWidthPx: 420,
      collapsed: true,
    });
    first.destroy();

    // Simulate reload: a fresh layout against the same storage starts collapsed at 420.
    const second = createBuilderLayout(parent, { storage });
    expect(second.getPanelState()).toEqual({
      chatWidthPx: 420,
      collapsed: true,
    });
    expect(second.chatPanel.style.display).toBe("none");
    expect(second.restoreBar.style.display).toBe("");

    // Click restore — chat returns to remembered 420px; state records collapsed=false.
    second.restoreBar.click();
    expect(second.chatPanel.style.display).toBe("");
    expect(second.chatPanel.style.width).toBe("420px");
    expect(second.getPanelState()).toEqual({
      chatWidthPx: 420,
      collapsed: false,
    });
  });
});
