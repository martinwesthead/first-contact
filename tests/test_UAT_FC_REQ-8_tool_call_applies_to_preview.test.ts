// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BuilderStore,
  buildFrameworkCatalog,
  createPreviewPanel,
  runChatTurn,
} from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { makeChatSSEResponse } from "./_helpers_REQ-36_chat_sse.js";

describe("UAT FC REQ-8: a stubbed tool call updates the store and re-renders the preview iframe", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("applies set_theme_token through the validator, updates the store, and the new token value appears in the iframe's CSS", async () => {
    const site = load1stContactSite();
    const store = new BuilderStore({
      siteDefinition: site,
      chatHistory: [],
      activeSessionId: "sess_test_REQ-8_preview",
    });
    const catalog = buildFrameworkCatalog();
    const panel = createPreviewPanel(document.body);
    store.subscribe((state) => panel.render(state.siteDefinition));
    panel.render(store.getState().siteDefinition);

    // Baseline: primary token = #2563eb (from the bundled site).
    const baselineCss = panel.iframe.contentDocument!.head.querySelector("style")!
      .textContent!;
    expect(baselineCss).toContain("--color-primary: #2563eb");

    // Stub /api/chat to return one set_theme_token call.
    const fetchMock = vi.fn(async () =>
      makeChatSSEResponse({
        text: "Updated the primary color.",
        toolCalls: [
          {
            name: "set_theme_token",
            input: { name: "palette.primary", value: "#ff0099" },
          },
        ],
      }),
    );

    const result = await runChatTurn("make the primary color pink", {
      store,
      catalog,
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].accepted).toBe(true);
    expect(store.getState().siteDefinition.theme.palette.primary).toBe("#ff0099");

    const updatedCss = panel.iframe.contentDocument!.head.querySelector("style")!
      .textContent!;
    expect(updatedCss).toContain("--color-primary: #ff0099");
    expect(updatedCss).not.toContain("--color-primary: #2563eb");
  });
});

