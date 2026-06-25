// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createPreviewPanel, VIEWPORT_PRESETS } from "@1stcontact/builder-ui";

describe("UAT AC-481: preview viewport presets resize the iframe to mobile 375px, tablet 768px, desktop 100%", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC481_viewport_presets_resize_iframe_and_track_active_state", () => {
    const panel = createPreviewPanel(document.body);

    const mobileBtn = panel.root.querySelector<HTMLButtonElement>(
      '[data-fc-viewport="mobile"]',
    )!;
    const tabletBtn = panel.root.querySelector<HTMLButtonElement>(
      '[data-fc-viewport="tablet"]',
    )!;
    const desktopBtn = panel.root.querySelector<HTMLButtonElement>(
      '[data-fc-viewport="desktop"]',
    )!;

    // Initial state: desktop preset, iframe width 100%, desktop button active.
    expect(panel.getViewport()).toBe("desktop");
    expect(panel.iframe.style.width).toBe(VIEWPORT_PRESETS.desktop);
    expect(panel.iframe.style.width).toBe("100%");
    expect(desktopBtn.getAttribute("aria-pressed")).toBe("true");
    expect(mobileBtn.getAttribute("aria-pressed")).toBe("false");
    expect(tabletBtn.getAttribute("aria-pressed")).toBe("false");

    // Mobile preset: 375px, mobile only active.
    mobileBtn.click();
    expect(panel.getViewport()).toBe("mobile");
    expect(panel.iframe.style.width).toBe("375px");
    expect(mobileBtn.getAttribute("aria-pressed")).toBe("true");
    expect(tabletBtn.getAttribute("aria-pressed")).toBe("false");
    expect(desktopBtn.getAttribute("aria-pressed")).toBe("false");

    // Tablet preset: 768px, tablet only active.
    tabletBtn.click();
    expect(panel.iframe.style.width).toBe("768px");
    expect(tabletBtn.getAttribute("aria-pressed")).toBe("true");
    expect(mobileBtn.getAttribute("aria-pressed")).toBe("false");
    expect(desktopBtn.getAttribute("aria-pressed")).toBe("false");

    // Back to desktop: 100%, desktop only active.
    desktopBtn.click();
    expect(panel.iframe.style.width).toBe("100%");
    expect(desktopBtn.getAttribute("aria-pressed")).toBe("true");
    expect(mobileBtn.getAttribute("aria-pressed")).toBe("false");
    expect(tabletBtn.getAttribute("aria-pressed")).toBe("false");
  });
});
