// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  BuilderStore,
  buildEmptyScaffold,
  buildFrameworkCatalog,
  runChatTurn,
} from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { makeChatSSEResponse } from "./_helpers_REQ-36_chat_sse.js";

describe("UAT FC REQ-34: chat-driver applies the cleared scaffold to the store before subsequent state_edit tool calls", () => {
  it("transcribe_site_done's clearedSiteDefinition replaces the populated 1stcontact draft; following set_theme_token lands on the cleared scaffold's defaults", async () => {
    // Start from the populated 1stcontact starter (many modules across pages).
    const startingSite = load1stContactSite();
    const store = new BuilderStore({
      siteDefinition: startingSite,
      chatHistory: [],
      activeSessionId: "sess_uat_req34_test",
    });
    const catalog = buildFrameworkCatalog();

    // Sanity — the 1stcontact starter actually has modules on the home page.
    const homeBefore = startingSite.pages.find((p) => p.slug === "/");
    expect(homeBefore).toBeDefined();
    expect(homeBefore!.modules.length).toBeGreaterThan(0);

    // The empty scaffold the server hands back, seeded from the source title.
    const cleared = buildEmptyScaffold({ businessName: "Acme Co" });

    // Stub /api/chat to emulate the convert turn's tool-call sequence:
    //   1. transcribe_site (system_action) → returns transcribe_site_done with clearedSiteDefinition.
    //   2. set_theme_token (state_edit) → should land on the cleared scaffold.
    const fetchMock = vi.fn(async () =>
      makeChatSSEResponse({
        text: "Converted https://acme.test/ — palette and content applied.",
        toolCalls: [
          {
            name: "transcribe_site",
            input: { digestId: "https://acme.test/" },
            result: {
              ok: true,
              applied: {
                tool: "transcribe_site",
                args: { digestId: "https://acme.test/" },
                summary: "Transcription complete",
                kind: "transcribe_site_done",
                data: {
                  kind: "transcribe_site_done",
                  clearedSiteDefinition: cleared,
                },
              },
            },
          },
          {
            name: "set_theme_token",
            input: { name: "palette.primary", value: "#ff0099" },
          },
        ],
      }),
    );

    const result = await runChatTurn("Reproduce https://acme.test/", {
      store,
      catalog,
      fetch: fetchMock as unknown as typeof fetch,
    });

    // Both tool calls accepted.
    expect(result.toolCalls).toHaveLength(2);
    expect(result.toolCalls[0].accepted).toBe(true);
    expect(result.toolCalls[1].accepted).toBe(true);

    const next = store.getState().siteDefinition;

    // The previous draft's modules are gone — the cleared scaffold wins.
    const homeAfter = next.pages.find((p) => p.slug === "/");
    expect(homeAfter).toBeDefined();
    expect(homeAfter!.modules).toEqual([]);
    expect(next.pages.length).toBe(1);
    expect(next.config.businessName).toBe("Acme Co");

    // The state_edit that followed lands on the cleared scaffold's defaults
    // (so the primary token reflects the AI's setting, not 1stcontact's).
    expect(next.theme.palette.primary).toBe("#ff0099");
  });
});

