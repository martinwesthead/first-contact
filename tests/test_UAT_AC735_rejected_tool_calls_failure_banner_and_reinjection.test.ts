// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  BuilderStore,
  buildFrameworkCatalog,
  createChatPanel,
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

describe("UAT AC-735: rejected tool calls surface in a dismissable failure banner and re-inject as a synthetic system message on the next turn", () => {
  it("test_UAT_AC735_failure_banner_reveals_dismisses_and_reinjects_on_next_turn", async () => {
    // ---- Part 1: Banner reveal + dismiss --------------------------------
    const bannerStore = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const root = document.createElement("div");
    document.body.appendChild(root);
    const panel = createChatPanel(root, {
      store: bannerStore,
      onSend: vi.fn(async () => undefined),
    });

    // No pending failures → banner hidden.
    expect(panel.failurePanel.hidden).toBe(true);

    // Two rejected tool calls land → banner revealed, one row per failed tool,
    // each carrying the tool name and its error text.
    bannerStore.recordToolFailures([
      {
        name: "set_module_content",
        input: { instance_id: "missing", field: "heading", value: "X" },
        error: "no module with id 'missing'",
      },
      {
        name: "add_module",
        input: { page_id: "bad", type: "hero", version: 1 },
        error: "page_id 'bad' not found",
      },
    ]);

    expect(panel.failurePanel.hidden).toBe(false);
    const rows = panel.failurePanel.querySelectorAll(
      "[data-fc-chat-failure-tool]",
    );
    expect(rows.length).toBe(2);
    expect(rows[0].getAttribute("data-fc-chat-failure-tool")).toBe(
      "set_module_content",
    );
    expect(rows[1].getAttribute("data-fc-chat-failure-tool")).toBe(
      "add_module",
    );
    expect(panel.failurePanel.textContent ?? "").toMatch(/no module with id/);

    // Dismiss clears the buffer and hides the banner again.
    const dismiss = panel.failurePanel.querySelector(
      "[data-fc-chat-failure-dismiss]",
    ) as HTMLButtonElement;
    expect(dismiss).not.toBeNull();
    dismiss.click();

    expect(panel.failurePanel.hidden).toBe(true);
    expect(bannerStore.getState().pendingToolFailures).toEqual([]);
    panel.destroy();

    // ---- Part 2: Re-injection on the next outbound turn -----------------
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const catalog = buildFrameworkCatalog();

    // Turn 1: the AI fires a tool call against a non-existent instance — the
    // call is rejected, so the driver records it in pendingToolFailures.
    const turn1Frames =
      sseFrame("tool_call", {
        name: "set_module_content",
        input: { instance_id: "does-not-exist", field: "heading", value: "X" },
        toolUseId: "tu_1",
      }) +
      sseFrame("tool_result", {
        name: "set_module_content",
        input: { instance_id: "does-not-exist", field: "heading", value: "X" },
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

    const turn1 = await runChatTurn("update the hero", {
      store,
      catalog,
      chatSessionId: "sess_ac735",
      fetch: vi.fn(async () => sseResponse(turn1Frames)) as unknown as typeof fetch,
    });
    expect(turn1.toolCalls).toHaveLength(1);
    expect(turn1.toolCalls[0].accepted).toBe(false);

    const pending = store.getState().pendingToolFailures;
    expect(pending).toHaveLength(1);
    expect(pending[0].name).toBe("set_module_content");
    expect(pending[0].error.length).toBeGreaterThan(0);

    // Turn 2 (server-resident reinjection): the dead in-band `history` field is
    // gone — the driver persists the synthetic `system` note via the session
    // messages endpoint (POST /api/chats/:id/messages) so the server's
    // tail-load picks it up on the next /api/chat call. Capture that POST and
    // assert it names the failed tool and mentions failure; the pending buffer
    // is cleared once it ships, and the /api/chat body carries no `history`.
    let appendedSystemNote: { role: string; content: string } | null = null;
    let chatTurnBody: Record<string, unknown> | null = null;
    const fetchTurn2 = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = typeof url === "string" ? url : url.toString();
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      if (/\/api\/chats\/[^/]+\/messages\/?$/.test(u)) {
        if (body.role === "system") {
          appendedSystemNote = {
            role: String(body.role),
            content: String(body.content),
          };
        }
        return new Response(
          JSON.stringify({
            id: "m_sys",
            session_id: "sess_ac735",
            ord: 99,
            role: body.role,
            content: body.content,
            ts: 1,
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        );
      }
      // POST /api/chat
      chatTurnBody = body;
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
      chatSessionId: "sess_ac735",
      fetch: fetchTurn2 as unknown as typeof fetch,
    });

    expect(appendedSystemNote).not.toBeNull();
    expect(appendedSystemNote!.role).toBe("system");
    expect(appendedSystemNote!.content).toMatch(/set_module_content/);
    expect(appendedSystemNote!.content.toLowerCase()).toMatch(/fail/);
    expect(store.getState().pendingToolFailures).toEqual([]);
    // The outbound chat turn no longer carries the dead in-band `history` field.
    expect(chatTurnBody).not.toBeNull();
    expect(chatTurnBody!.history).toBeUndefined();
    expect(chatTurnBody!.sessionId).toBe("sess_ac735");

    // ---- Part 3: an all-accepted turn leaves the buffer empty -----------
    const okStore = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const okFrames =
      sseFrame("tool_call", {
        name: "set_theme_token",
        input: { name: "palette.primary", value: "#ff0000" },
        toolUseId: "tu_ok",
      }) +
      sseFrame("tool_result", {
        name: "set_theme_token",
        input: { name: "palette.primary", value: "#ff0000" },
        toolUseId: "tu_ok",
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

    const okResult = await runChatTurn("change primary color", {
      store: okStore,
      catalog,
      chatSessionId: "sess_ac735_ok",
      fetch: vi.fn(async () => sseResponse(okFrames)) as unknown as typeof fetch,
    });
    expect(okResult.toolCalls[0].accepted).toBe(true);
    expect(okStore.getState().pendingToolFailures).toEqual([]);
  });
});
