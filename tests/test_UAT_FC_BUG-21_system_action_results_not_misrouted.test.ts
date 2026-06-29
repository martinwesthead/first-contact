// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  BuilderStore,
  buildFrameworkCatalog,
  runChatTurn,
} from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

/** SSE frame helper — assembles the wire format the streaming driver parses. */
function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function sseResponse(frames: string): Response {
  return new Response(frames, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

/**
 * BUG-21: server-side `system_action` tools (analyze_page, transcribe_site,
 * read_transcription_digest, …) execute server-side only. The client driver
 * must NOT re-run their results through `applyToolCall` (the browser preview
 * dispatcher), which only knows `state_edit` tools and would wrongly reject
 * them as `unknown tool` — then reinject that bogus failure into the next turn,
 * telling the model its real tools don't exist.
 */
describe("UAT FC BUG-21: system_action tool results are not mis-routed to the browser dispatcher", () => {
  it("records an accepted analyze_page (system_action) result without an `unknown tool` error and without a pending failure", async () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
      activeSessionId: "sess_bug21_analyze",
    });
    const catalog = buildFrameworkCatalog();

    const input = { url: "https://gigabytealchemy.ai/" };
    const frames =
      sseFrame("tool_call", {
        name: "analyze_page",
        input,
        toolUseId: "tu_1",
      }) +
      sseFrame("tool_result", {
        name: "analyze_page",
        input,
        toolUseId: "tu_1",
        result: {
          ok: true,
          applied: {
            tool: "analyze_page",
            args: input,
            summary: "Analyzed gigabytealchemy.ai",
            kind: "digest_report",
            data: { url: input.url },
          },
        },
      }) +
      sseFrame("done", {
        text: "Analyzed.",
        toolCalls: [],
        systemActions: [],
        intentToken: null,
      });

    const fetchMock = vi.fn(async () => sseResponse(frames));
    const result = await runChatTurn("analyze gigabytealchemy.ai", {
      store,
      catalog,
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(result.toolCalls).toHaveLength(1);
    const call = result.toolCalls[0]!;
    expect(call.name).toBe("analyze_page");
    expect(call.accepted).toBe(true);
    expect(call.error).toBeUndefined();
    // The bug: this came back as `unknown tool: analyze_page`.
    expect(JSON.stringify(call)).not.toMatch(/unknown tool/i);
    // And it must not poison the next turn.
    expect(store.getState().pendingToolFailures).toEqual([]);
  });

  it("surfaces a rejected transcribe_site (system_action) with the SERVER error, not `unknown tool`", async () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
      activeSessionId: "sess_bug21_reject",
    });
    const catalog = buildFrameworkCatalog();

    const input = { url: "https://gigabytealchemy.ai/" };
    const serverMessage =
      "digest_not_found: no digest record for https://gigabytealchemy.ai/ — run analyze_page first";
    const frames =
      sseFrame("tool_call", {
        name: "transcribe_site",
        input,
        toolUseId: "tu_1",
      }) +
      sseFrame("tool_result", {
        name: "transcribe_site",
        input,
        toolUseId: "tu_1",
        result: {
          ok: false,
          error: {
            tool: "transcribe_site",
            validation: { message: serverMessage },
          },
        },
      }) +
      sseFrame("done", {
        text: "I couldn't transcribe yet.",
        toolCalls: [],
        systemActions: [],
        intentToken: null,
      });

    const fetchMock = vi.fn(async () => sseResponse(frames));
    const result = await runChatTurn("convert gigabytealchemy.ai", {
      store,
      catalog,
      fetch: fetchMock as unknown as typeof fetch,
    });

    const call = result.toolCalls[0]!;
    expect(call.accepted).toBe(false);
    expect(call.error).toBe(serverMessage);
    expect(call.error).not.toMatch(/unknown tool/i);

    // The reinjected failure must carry the real server reason, not the bogus
    // `unknown tool` that was gaslighting the model.
    const pending = store.getState().pendingToolFailures;
    expect(pending).toHaveLength(1);
    expect(pending[0]!.name).toBe("transcribe_site");
    expect(pending[0]!.error).toBe(serverMessage);
    expect(pending[0]!.error).not.toMatch(/unknown tool/i);
  });

  it("still mirrors a state_edit tool (set_theme_token) onto the working site via applyToolCall", async () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
      activeSessionId: "sess_bug21_state_edit",
    });
    const catalog = buildFrameworkCatalog();

    const input = { name: "palette.primary", value: "#ff0000" };
    const frames =
      sseFrame("tool_call", {
        name: "set_theme_token",
        input,
        toolUseId: "tu_1",
      }) +
      sseFrame("tool_result", {
        name: "set_theme_token",
        input,
        toolUseId: "tu_1",
        result: {
          ok: true,
          applied: {
            tool: "set_theme_token",
            args: input,
            summary: "Set palette.primary",
          },
        },
      }) +
      sseFrame("done", {
        text: "Done.",
        toolCalls: [],
        systemActions: [],
        intentToken: null,
      });

    const fetchMock = vi.fn(async () => sseResponse(frames));
    const result = await runChatTurn("make the primary color red", {
      store,
      catalog,
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(result.toolCalls[0]!.accepted).toBe(true);
    // Local apply ran: the working site reflects the new token value.
    const theme = store.getState().siteDefinition.theme as Record<
      string,
      unknown
    >;
    const palette = theme.palette as Record<string, unknown> | undefined;
    expect(palette?.primary).toBe("#ff0000");
    expect(store.getState().pendingToolFailures).toEqual([]);
  });
});
