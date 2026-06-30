// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createAssetsTab } from "../packages/builder-ui/src/components/assets-tab.js";
import { MockAssetServer } from "./_helpers_REQ-16_assets.js";

describe("UAT FC REQ-16: assets tab lists assets from /api/assets/list", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders one row per asset with a filename and a type-appropriate icon", async () => {
    const server = new MockAssetServer({
      "guide.md": { body: "# Guide", contentType: "text/markdown" },
      "logo.png": { body: "binary", contentType: "image/png" },
      "robots.txt": { body: "User-agent: *", contentType: "text/plain" },
      "data.bin": { body: "x", contentType: "application/octet-stream" },
    });

    const tab = createAssetsTab(document.body, { fetch: server.fetch });
    await tab.refresh();

    const rows = Array.from(
      tab.leftPanel.querySelectorAll<HTMLElement>("[data-fc-assets-row]"),
    );
    expect(rows.map((r) => r.getAttribute("data-fc-assets-row")).sort()).toEqual([
      "data.bin",
      "guide.md",
      "logo.png",
      "robots.txt",
    ]);

    const iconFor = (key: string): string =>
      tab.leftPanel
        .querySelector(`[data-fc-assets-row="${key}"] .fc-assets__row-icon`)!
        .textContent!;
    expect(iconFor("guide.md")).toBe("📝");
    expect(iconFor("logo.png")).toBe("🖼");
    expect(iconFor("robots.txt")).toBe("📄");
    expect(iconFor("data.bin")).toBe("📦");

    tab.destroy();
  });
});
