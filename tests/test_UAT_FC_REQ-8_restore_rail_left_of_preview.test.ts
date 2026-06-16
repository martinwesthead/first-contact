// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createBuilderLayout } from "@1stcontact/builder-ui/layout";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";

describe("UAT FC REQ-8: collapsed restore rail sits left of the preview", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the restore rail before the preview panel so it appears on the left edge when collapsed, with full-height flex styling", () => {
    const storage = new MemoryStorage();
    const layout = createBuilderLayout(document.body, {
      storage,
      collapsedBarWidthPx: 32,
    });

    // The restore bar must sit BEFORE the preview panel in DOM order,
    // so that when chatPanel + splitter are display:none the visible row
    // is [restoreBar | previewPanel] — restoreBar on the LEFT edge.
    const children = Array.from(layout.root.children);
    const restoreIdx = children.indexOf(layout.restoreBar);
    const previewIdx = children.indexOf(layout.previewPanel);
    expect(restoreIdx).toBeGreaterThanOrEqual(0);
    expect(previewIdx).toBeGreaterThan(restoreIdx);

    // Inline flex styles ensure the rail renders as a visible, full-height
    // centered chevron even if the page CSS is missing.
    expect(layout.restoreBar.style.alignItems).toBe("center");
    expect(layout.restoreBar.style.justifyContent).toBe("center");
    expect(layout.restoreBar.style.height).toBe("100%");

    // Collapse: rail visible at the configured width, panel + splitter hidden.
    layout.collapseButton.click();
    expect(layout.chatPanel.style.display).toBe("none");
    expect(layout.splitter.style.display).toBe("none");
    expect(layout.restoreBar.style.display).toBe("");
    expect(layout.restoreBar.style.width).toBe("32px");
  });
});
