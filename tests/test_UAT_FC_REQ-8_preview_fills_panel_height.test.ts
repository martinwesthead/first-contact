// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createPreviewPanel } from "@gendev/builder-ui";

describe("UAT FC REQ-8: preview panel fills the available height", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("forces the preview root to a flex column and the iframe to flex into the available space, so the viewport switcher does not collapse the iframe to its intrinsic height", () => {
    const panel = createPreviewPanel(document.body);

    // The preview root must be a flex column that fills its parent — without
    // this, the iframe's height:100% resolves against an auto-height block
    // and the preview collapses to ~50px when the toolbar is added.
    expect(panel.root.style.display).toBe("flex");
    expect(panel.root.style.flexDirection).toBe("column");
    expect(panel.root.style.flex).toBe("1 1 auto");
    expect(panel.root.style.minHeight).toBe("0px");
    expect(panel.root.style.height).toBe("100%");

    // The iframe must flex into the remaining space and tolerate min-height:0
    // so it does not push the toolbar out of view.
    expect(panel.iframe.style.flex).toBe("1 1 auto");
    expect(panel.iframe.style.minHeight).toBe("0px");

    // Switching viewport changes width but must leave the flex/height contract intact.
    const mobileBtn = panel.root.querySelector<HTMLButtonElement>(
      '[data-fc-viewport="mobile"]',
    )!;
    mobileBtn.click();
    expect(panel.iframe.style.flex).toBe("1 1 auto");
    expect(panel.iframe.style.minHeight).toBe("0px");
  });
});
