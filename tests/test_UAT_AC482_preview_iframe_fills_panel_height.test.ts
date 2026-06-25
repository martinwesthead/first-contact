// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createPreviewPanel } from "@1stcontact/builder-ui";

describe("UAT AC-482: preview iframe fills the full height of its panel rather than collapsing to the iframe default", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC482_preview_iframe_fills_panel_height_via_flex_column_contract", () => {
    const panel = createPreviewPanel(document.body);

    // The preview root must be a flex column that fills its parent. Without
    // this the iframe's height:100% resolves against an auto-height block and
    // collapses to its intrinsic ~150px default.
    expect(panel.root.style.display).toBe("flex");
    expect(panel.root.style.flexDirection).toBe("column");
    expect(panel.root.style.flex).toBe("1 1 auto");
    expect(panel.root.style.minHeight).toBe("0px");
    expect(panel.root.style.height).toBe("100%");

    // The iframe must flex into the remaining space (after the toolbar) and
    // tolerate min-height:0 so it does not push the toolbar out of view.
    expect(panel.iframe.style.flex).toBe("1 1 auto");
    expect(panel.iframe.style.minHeight).toBe("0px");
    expect(panel.iframe.style.height).toBe("100%");

    // Switching viewport changes width but leaves the flex/height contract intact —
    // the iframe must continue to stretch to the panel's available height.
    const mobileBtn = panel.root.querySelector<HTMLButtonElement>(
      '[data-fc-viewport="mobile"]',
    )!;
    mobileBtn.click();
    expect(panel.iframe.style.flex).toBe("1 1 auto");
    expect(panel.iframe.style.minHeight).toBe("0px");
    expect(panel.iframe.style.height).toBe("100%");
  });
});
