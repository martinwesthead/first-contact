// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createAssetsTab } from "../packages/builder-ui/src/components/assets-tab.js";
import {
  MockAssetServer,
  flush,
  makeStubEditorLoader,
} from "./_helpers_REQ-16_assets.js";

describe("UAT FC REQ-16: getVisibleContext() exposes the operator's current view", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("reports the asset list, the selected key/content-type, and editor dirtiness", async () => {
    const server = new MockAssetServer({
      "doc.md": { body: "# Doc", contentType: "text/markdown" },
      "pic.png": { body: "x", contentType: "image/png" },
    });
    const { loader, instances } = makeStubEditorLoader();
    const tab = createAssetsTab(document.body, {
      fetch: server.fetch,
      loadEditor: loader,
    });
    await tab.refresh();

    // Nothing selected yet.
    let ctx = tab.getVisibleContext();
    expect(ctx.tab).toBe("assets");
    expect([...ctx.assetList].sort()).toEqual(["doc.md", "pic.png"]);
    expect(ctx.selectedAssetKey).toBeNull();
    expect(ctx.selectedContentType).toBeNull();
    expect(ctx.isEditorDirty).toBe(false);

    // Select the markdown doc and edit it.
    tab.leftPanel
      .querySelector<HTMLButtonElement>(
        '[data-fc-assets-row="doc.md"] .fc-assets__row-select',
      )!
      .click();
    await flush();
    instances[0]!.setMarkdown("# Doc edited");

    ctx = tab.getVisibleContext();
    expect(ctx.selectedAssetKey).toBe("doc.md");
    expect(ctx.selectedContentType).toBe("text/markdown");
    expect(ctx.isEditorDirty).toBe(true);

    tab.destroy();
  });
});
