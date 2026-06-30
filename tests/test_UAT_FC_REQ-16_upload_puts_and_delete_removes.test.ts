// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createAssetsTab } from "../packages/builder-ui/src/components/assets-tab.js";
import { MockAssetServer, flush } from "./_helpers_REQ-16_assets.js";

describe("UAT FC REQ-16: uploading PUTs files and per-row delete removes them", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("PUTs each selected file to /api/assets/put/<key> then shows it in the list", async () => {
    const server = new MockAssetServer();
    const tab = createAssetsTab(document.body, { fetch: server.fetch });
    await tab.refresh();

    const fileInput = tab.leftPanel.querySelector<HTMLInputElement>(
      "[data-fc-assets-file-input]",
    )!;
    const file = new File(["# Notes"], "notes.md", { type: "text/markdown" });
    Object.defineProperty(fileInput, "files", {
      value: [file],
      configurable: true,
    });
    fileInput.dispatchEvent(new Event("change"));
    await flush();

    const put = server.calls.find((c) => c.method === "PUT");
    expect(put).toMatchObject({ key: "notes.md", contentType: "text/markdown" });
    expect(server.has("notes.md")).toBe(true);
    expect(
      tab.leftPanel.querySelector('[data-fc-assets-row="notes.md"]'),
    ).toBeTruthy();

    tab.destroy();
  });

  it("DELETEs via /api/assets/delete/<key> after confirmation and drops the row", async () => {
    const server = new MockAssetServer({
      "old.txt": { body: "stale", contentType: "text/plain" },
    });
    const confirmCalls: string[] = [];
    const tab = createAssetsTab(document.body, {
      fetch: server.fetch,
      confirm: (m) => {
        confirmCalls.push(m);
        return true;
      },
    });
    await tab.refresh();

    tab.leftPanel
      .querySelector<HTMLButtonElement>(
        '[data-fc-assets-row="old.txt"] .fc-assets__row-delete',
      )!
      .click();
    await flush();

    expect(confirmCalls).toHaveLength(1);
    expect(server.calls.some((c) => c.method === "DELETE" && c.key === "old.txt")).toBe(
      true,
    );
    expect(server.has("old.txt")).toBe(false);
    expect(
      tab.leftPanel.querySelector('[data-fc-assets-row="old.txt"]'),
    ).toBeNull();

    tab.destroy();
  });

  it("does not DELETE when the confirmation is declined", async () => {
    const server = new MockAssetServer({
      "keep.txt": { body: "important", contentType: "text/plain" },
    });
    const tab = createAssetsTab(document.body, {
      fetch: server.fetch,
      confirm: () => false,
    });
    await tab.refresh();

    tab.leftPanel
      .querySelector<HTMLButtonElement>(
        '[data-fc-assets-row="keep.txt"] .fc-assets__row-delete',
      )!
      .click();
    await flush();

    expect(server.calls.some((c) => c.method === "DELETE")).toBe(false);
    expect(server.has("keep.txt")).toBe(true);

    tab.destroy();
  });
});
