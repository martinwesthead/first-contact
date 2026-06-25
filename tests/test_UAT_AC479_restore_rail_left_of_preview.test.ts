// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createBuilderLayout } from "@1stcontact/builder-ui/layout";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";

describe("UAT AC-479: collapsed restore rail sits on the left edge of the preview, not the right", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC479_restore_rail_sits_left_of_preview_in_dom_order", () => {
    const storage = new MemoryStorage();
    const layout = createBuilderLayout(document.body, {
      storage,
      collapsedBarWidthPx: 32,
    });

    const children = Array.from(layout.root.children);
    const chatIdx = children.indexOf(layout.chatPanel);
    const splitterIdx = children.indexOf(layout.splitter);
    const restoreIdx = children.indexOf(layout.restoreBar);
    const previewIdx = children.indexOf(layout.previewPanel);

    // Document order: chat → splitter → restoreBar → preview
    // so the collapsed rail appears LEFT of the preview, where the chat was.
    expect(chatIdx).toBeGreaterThanOrEqual(0);
    expect(splitterIdx).toBe(chatIdx + 1);
    expect(restoreIdx).toBe(splitterIdx + 1);
    expect(previewIdx).toBe(restoreIdx + 1);

    // Trigger collapse: chat + splitter hidden, restore rail visible.
    layout.collapseButton.click();
    expect(layout.chatPanel.style.display).toBe("none");
    expect(layout.splitter.style.display).toBe("none");
    expect(layout.restoreBar.style.display).toBe("");
    expect(layout.restoreBar.style.width).toBe("32px");
  });
});
