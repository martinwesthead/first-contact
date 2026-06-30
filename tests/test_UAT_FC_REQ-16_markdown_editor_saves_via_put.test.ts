// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createAssetsTab } from "../packages/builder-ui/src/components/assets-tab.js";
import {
  MockAssetServer,
  flush,
  makeStubEditorLoader,
} from "./_helpers_REQ-16_assets.js";

describe("UAT FC REQ-16: markdown assets open in the editor and save via PUT", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("loads the markdown body, enables Save only when dirty, and PUTs edited content", async () => {
    const server = new MockAssetServer({
      "readme.md": { body: "# Hello", contentType: "text/markdown" },
    });
    const { loader, instances } = makeStubEditorLoader();
    const tab = createAssetsTab(document.body, {
      fetch: server.fetch,
      loadEditor: loader,
    });
    await tab.refresh();

    tab.leftPanel
      .querySelector<HTMLButtonElement>(
        '[data-fc-assets-row="readme.md"] .fc-assets__row-select',
      )!
      .click();
    await flush();

    // The editor was mounted with the asset's current markdown.
    expect(instances).toHaveLength(1);
    expect(instances[0]!.initialMarkdown).toBe("# Hello");

    const saveBtn = tab.rightPanel.querySelector<HTMLButtonElement>(
      "[data-fc-assets-save]",
    )!;
    // Clean on load → Save disabled.
    expect(saveBtn.disabled).toBe(true);

    // Operator edits → Save enables.
    instances[0]!.setMarkdown("# Hello\n\nworld");
    expect(saveBtn.disabled).toBe(false);

    // Save → PUT carries the edited markdown with the asset's content-type.
    saveBtn.click();
    await flush();
    const put = server.calls.find((c) => c.method === "PUT" && c.key === "readme.md");
    expect(put).toMatchObject({
      contentType: "text/markdown",
      body: "# Hello\n\nworld",
    });

    // After a successful save the baseline resets → Save disabled again.
    expect(saveBtn.disabled).toBe(true);

    tab.destroy();
  });
});
