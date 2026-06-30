// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createAssetsTab } from "../packages/builder-ui/src/components/assets-tab.js";
import { MockAssetServer, flush } from "./_helpers_REQ-16_assets.js";

describe("UAT FC REQ-16: an asset with no preview offers a download link", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders a 'No preview' notice and a download anchor pointing at /assets/<key>", async () => {
    const server = new MockAssetServer({
      "archive.zip": { body: "PK....", contentType: "application/zip" },
    });

    const tab = createAssetsTab(document.body, { fetch: server.fetch });
    await tab.refresh();

    tab.leftPanel
      .querySelector<HTMLButtonElement>(
        '[data-fc-assets-row="archive.zip"] .fc-assets__row-select',
      )!
      .click();
    await flush();

    expect(
      tab.rightPanel.querySelector("[data-fc-assets-no-preview]"),
    ).toBeTruthy();
    const link = tab.rightPanel.querySelector<HTMLAnchorElement>(
      "[data-fc-assets-download]",
    )!;
    expect(link.getAttribute("href")).toBe("/assets/archive.zip");
    expect(link.getAttribute("download")).toBe("archive.zip");
    // No editor or image surface for an unpreviewable asset.
    expect(tab.rightPanel.querySelector("[data-fc-assets-editor]")).toBeNull();
    expect(tab.rightPanel.querySelector("[data-fc-assets-image]")).toBeNull();

    tab.destroy();
  });
});
