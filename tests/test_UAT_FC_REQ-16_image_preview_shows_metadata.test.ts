// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createAssetsTab } from "../packages/builder-ui/src/components/assets-tab.js";
import { MockAssetServer, flush } from "./_helpers_REQ-16_assets.js";

describe("UAT FC REQ-16: selecting an image renders a preview with a metadata sidecar", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows an <img> served from /assets/<key> plus filename, content-type and KB size", async () => {
    const server = new MockAssetServer({
      "photos/hero.png": { body: "x".repeat(2048), contentType: "image/png" },
    });

    const tab = createAssetsTab(document.body, { fetch: server.fetch });
    await tab.refresh();

    tab.leftPanel
      .querySelector<HTMLButtonElement>(
        '[data-fc-assets-row="photos/hero.png"] .fc-assets__row-select',
      )!
      .click();
    await flush();

    const img = tab.rightPanel.querySelector<HTMLImageElement>(
      "[data-fc-assets-image]",
    )!;
    expect(img).toBeTruthy();
    // Path-segment-encoded key: the slash is preserved as a path separator.
    expect(img.getAttribute("src")).toBe("/assets/photos/hero.png");

    const meta = tab.rightPanel.querySelector("[data-fc-assets-image-meta]")!;
    const text = meta.textContent ?? "";
    expect(text).toContain("photos/hero.png");
    expect(text).toContain("image/png");
    expect(text).toContain("2.0 KB");

    tab.destroy();
  });
});
