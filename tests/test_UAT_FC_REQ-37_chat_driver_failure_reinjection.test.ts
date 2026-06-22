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
 * Under REQ-25 the `history` field on /api/chat is gone — the synthetic
 * system note describing prior-turn failures is persisted via
 * POST /api/chats/:id/messages so the server's tail-load includes it. This
 * test verifies that adaptation: the driver POSTs the system note to the
 * messages endpoint, clears pending failures, and the next /api/chat call
 * sends only the new turn (no history field).
 */
describe("UAT FC REQ-37 (REQ-25-adapted): chat-driver persists tool-failure note via POST /api/chats/:id/messages", () => {
  it("records the failure, then on the next user turn POSTs a system note to the messages endpoint and proceeds with /api/chat", async () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
      activeSessionId: "sess_uat_req25_fail",
    });
    const catalog = buildFrameworkCatalog();

    // Turn 1: AI fires set_module_content for an instance that doesn't exist.
    const turn1Frames =
      sseFrame("tool_call", {
        name: "set_module_content",
        input: {
          instance_id: "does-not-exist",
          field: "heading",
          value: "X",
        },
        toolUseId: "tu_1",
      }) +
      sseFrame("tool_result", {
        name: "set_module_content",
        input: {
          instance_id: "does-not-exist",
          field: "heading",
          value: "X",
        },
        toolUseId: "tu_1",
        result: {
          ok: false,
          error: {
            tool: "set_module_content",
            validation: { message: "no module with id 'does-not-exist'" },
          },
        },
      }) +
      sseFrame("done", {
        text: "I'll update that.",
        toolCalls: [],
        systemActions: [],
        intentToken: null,
      });

    const fetchTurn1 = vi.fn(async () => sseResponse(turn1Frames));

    const turn1 = await runChatTurn("update the hero", {
      store,
      catalog,
      fetch: fetchTurn1 as unknown as typeof fetch,
    });
    expect(turn1.toolCalls).toHaveLength(1);
    expect(turn1.toolCalls[0]!.accepted).toBe(false);

    const pending = store.getState().pendingToolFailures;
    expect(pending).toHaveLength(1);
    expect(pending[0]!.name).toBe("set_module_content");

    // Turn 2: capture every fetch the driver issues. Expect:
    //   1. POST /api/chats/sess_uat_req25_fail/messages with role=system
    //      describing the failure (the persisted reinjection)
    //   2. POST /api/chat with body containing sessionId+userMessage
    //      (no `history` field — that contract is dead under REQ-25)
    type Captured = { url: string; init?: RequestInit };
    const captured: Captured[] = [];
    const fetchTurn2 = vi.fn(async (url: string, init?: RequestInit) => {
      captured.push({ url, init });
      if (url.includes("/api/chats/") && url.endsWith("/messages")) {
        return new Response(
          JSON.stringify({
            id: "msg_persisted",
            session_id: "sess_uat_req25_fail",
            role: "system",
            content: "(persisted)",
            ord: 1,
          }),
          {
            status: 201,
            headers: { "content-type": "application/json" },
          },
        );
      }
      return sseResponse(
        sseFrame("done", {
          text: "Retrying.",
          toolCalls: [],
          systemActions: [],
          intentToken: null,
        }),
      );
    });

    await runChatTurn("try again", {
      store,
      catalog,
      fetch: fetchTurn2 as unknown as typeof fetch,
    });

    // The persisted system-note call comes first.
    const persistedNote = captured.find(
      (c) => c.url.includes("/api/chats/") && c.url.endsWith("/messages"),
    );
    expect(persistedNote).toBeDefined();
    expect(persistedNote!.url).toContain("sess_uat_req25_fail");
    const persistedBody = JSON.parse(String(persistedNote!.init?.body ?? "{}"));
    expect(persistedBody.role).toBe("system");
    expect(persistedBody.content).toMatch(/set_module_content/);
    expect(String(persistedBody.content).toLowerCase()).toMatch(/fail/);

    // Then /api/chat — with the new contract, no `history` field.
    const chatCall = captured.find((c) => c.url.endsWith("/api/chat"));
    expect(chatCall).toBeDefined();
    const chatBody = JSON.parse(String(chatCall!.init?.body ?? "{}"));
    expect(chatBody.sessionId).toBe("sess_uat_req25_fail");
    expect(chatBody.userMessage).toBe("try again");
    expect("history" in chatBody).toBe(false);

    expect(store.getState().pendingToolFailures).toEqual([]);
  });

  it("a turn with all-accepted tool calls leaves pendingToolFailures empty", async () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
      activeSessionId: "sess_uat_req25_ok",
    });
    const catalog = buildFrameworkCatalog();
    const frames =
      sseFrame("tool_call", {
        name: "set_theme_token",
        input: { name: "palette.primary", value: "#ff0000" },
        toolUseId: "tu_1",
      }) +
      sseFrame("tool_result", {
        name: "set_theme_token",
        input: { name: "palette.primary", value: "#ff0000" },
        toolUseId: "tu_1",
        result: {
          ok: true,
          applied: {
            tool: "set_theme_token",
            args: { name: "palette.primary", value: "#ff0000" },
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

    const result = await runChatTurn("change primary color", {
      store,
      catalog,
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect(result.toolCalls[0]!.accepted).toBe(true);
    expect(store.getState().pendingToolFailures).toEqual([]);
  });
});
