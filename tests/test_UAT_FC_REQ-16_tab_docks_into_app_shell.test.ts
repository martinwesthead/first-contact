// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createAppShell } from "@gendev/builder-ui/app-shell";
import { createAssetsTab } from "../packages/builder-ui/src/components/assets-tab.js";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";
import { MockAssetServer, flush } from "./_helpers_REQ-16_assets.js";

/**
 * REQ-16 ↔ REQ-17 integration: the Assets tab content factory docks into the
 * app shell's content area and renders its asset list when the tab activates —
 * the same wiring app-entry.ts uses in the browser.
 */
describe("UAT FC REQ-16: assets tab docks into the REQ-17 app shell", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the asset list inside the shell content area when the Assets tab is activated", async () => {
    const server = new MockAssetServer({
      "guide.md": { body: "# Guide", contentType: "text/markdown" },
      "logo.png": { body: "x", contentType: "image/png" },
    });

    const shell = createAppShell(document.body, {
      siteId: "acme",
      storage: new MemoryStorage(),
    });

    let assetsRoot: HTMLElement | null = null;
    shell.registerTab("assets", {
      label: "Assets",
      defaultChatOpen: true,
      factory: (content) => {
        const handle = createAssetsTab(content, { fetch: server.fetch });
        assetsRoot = handle.root;
        return { destroy: handle.destroy };
      },
    });

    shell.activateTab("assets", { push: false });
    await flush();

    // The tab content mounted into the shell, and the asset rows rendered.
    expect(assetsRoot).toBeTruthy();
    expect(document.body.contains(assetsRoot)).toBe(true);
    const rows = Array.from(
      document.body.querySelectorAll<HTMLElement>("[data-fc-assets-row]"),
    ).map((r) => r.getAttribute("data-fc-assets-row"));
    expect(rows.sort()).toEqual(["guide.md", "logo.png"]);

    shell.destroy();
  });
});
