// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BuilderStore,
  buildFrameworkCatalog,
  createPreviewPanel,
  runChatTurn,
} from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

describe("UAT AC-483: accepted AI tool call advances the working site and re-renders the preview", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC483_accepted_set_theme_token_updates_store_and_preview_iframe", async () => {
    const site = load1stContactSite();
    const store = new BuilderStore({ siteDefinition: site, chatHistory: [] });
    const catalog = buildFrameworkCatalog();
    const panel = createPreviewPanel(document.body);
    store.subscribe((state) => panel.render(state.siteDefinition));
    panel.render(store.getState().siteDefinition);

    // Baseline: primary token = #2563eb (from the bundled starter site).
    const baselineCss = panel.iframe.contentDocument!.head.querySelector("style")!
      .textContent!;
    expect(baselineCss).toContain("--color-primary: #2563eb");

    // Stub /api/chat to return a single set_theme_token call.
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          text: "Updated the primary color.",
          toolCalls: [
            {
              name: "set_theme_token",
              input: { name: "palette.primary", value: "#ff0099" },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await runChatTurn("make the primary color pink", {
      store,
      catalog,
      fetch: fetchMock as unknown as typeof fetch,
    });

    // Tool call accepted.
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].accepted).toBe(true);
    expect(result.toolCalls[0].name).toBe("set_theme_token");

    // Working site advanced to the post-tool-call value.
    expect(store.getState().siteDefinition.theme.palette.primary).toBe("#ff0099");

    // Assistant message at the end of chat history records the accepted call.
    const lastMessage = store.getState().chatHistory.at(-1)!;
    expect(lastMessage.role).toBe("assistant");
    expect(lastMessage.toolCalls).toHaveLength(1);
    expect(lastMessage.toolCalls![0].accepted).toBe(true);

    // Preview iframe re-rendered against the new site: CSS reflects new token.
    const updatedCss = panel.iframe.contentDocument!.head.querySelector("style")!
      .textContent!;
    expect(updatedCss).toContain("--color-primary: #ff0099");
    expect(updatedCss).not.toContain("--color-primary: #2563eb");
  });
});
