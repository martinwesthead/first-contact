// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createSplitLayout } from "../packages/builder-ui/src/components/split-layout.js";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";

describe("UAT FC REQ-16: createSplitLayout persists generic left/right state", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("collapses the left panel and restores the remembered width across reload", () => {
    const storage = new MemoryStorage();
    const key = "1stcontact_assets_panel_v1";

    const first = createSplitLayout(document.body, {
      storage,
      storageKey: key,
      initialLeftWidthPx: 280,
    });
    expect(first.leftPanel.style.width).toBe("280px");
    expect(first.rightPanel.style.flex).toBe("1 1 auto");

    first.collapse();
    expect(first.leftPanel.style.display).toBe("none");
    expect(first.restoreBar.style.display).toBe("");
    // Generic persisted shape uses leftWidthPx (not the builder's chatWidthPx).
    expect(JSON.parse(storage.getItem(key)!)).toEqual({
      leftWidthPx: 280,
      collapsed: true,
    });
    first.destroy();

    // Reload against the same storage: collapsed, width remembered.
    const second = createSplitLayout(document.body, { storage, storageKey: key });
    expect(second.getState()).toEqual({ leftWidthPx: 280, collapsed: true });
    expect(second.leftPanel.style.display).toBe("none");

    second.restore();
    expect(second.leftPanel.style.display).toBe("");
    expect(second.leftPanel.style.width).toBe("280px");
    expect(second.getState()).toEqual({ leftWidthPx: 280, collapsed: false });
  });
});
