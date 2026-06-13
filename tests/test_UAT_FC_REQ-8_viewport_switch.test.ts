// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  createPreviewPanel,
  VIEWPORT_PRESETS,
} from "@1stcontact/builder-ui";

describe("UAT FC REQ-8: viewport switch resizes the preview iframe", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("starts at desktop, then mobile / tablet presets resize the iframe to 375/768/100%", () => {
    const panel = createPreviewPanel(document.body);

    expect(panel.getViewport()).toBe("desktop");
    expect(panel.iframe.style.width).toBe(VIEWPORT_PRESETS.desktop);

    const mobileBtn = panel.root.querySelector<HTMLButtonElement>(
      '[data-fc-viewport="mobile"]',
    )!;
    const tabletBtn = panel.root.querySelector<HTMLButtonElement>(
      '[data-fc-viewport="tablet"]',
    )!;
    const desktopBtn = panel.root.querySelector<HTMLButtonElement>(
      '[data-fc-viewport="desktop"]',
    )!;

    mobileBtn.click();
    expect(panel.getViewport()).toBe("mobile");
    expect(panel.iframe.style.width).toBe("375px");
    expect(mobileBtn.getAttribute("aria-pressed")).toBe("true");
    expect(tabletBtn.getAttribute("aria-pressed")).toBe("false");

    tabletBtn.click();
    expect(panel.iframe.style.width).toBe("768px");
    expect(tabletBtn.getAttribute("aria-pressed")).toBe("true");
    expect(mobileBtn.getAttribute("aria-pressed")).toBe("false");

    desktopBtn.click();
    expect(panel.iframe.style.width).toBe("100%");
    expect(desktopBtn.getAttribute("aria-pressed")).toBe("true");
  });
});
