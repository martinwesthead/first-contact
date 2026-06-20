// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  BuilderStore,
  buildFrameworkCatalog,
  runChatTurn,
} from "@1stcontact/builder-ui";
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

describe("UAT FC REQ-37: chat-driver collects module-building failures and reinjects them on the next turn", () => {
  it("records a rejected tool call in store.pendingToolFailures, then on the next user turn prepends a synthetic system message describing it", async () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const catalog = buildFrameworkCatalog();

    // Turn 1: AI fires set_module_content for an instance that doesn't exist.
    // The server's tool_result carries ok:false; the local applyToolCall also
    // rejects. Driver should write the failure into store.pendingToolFailures.
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
    expect(turn1.toolCalls[0].accepted).toBe(false);

    const pending = store.getState().pendingToolFailures;
    expect(pending).toHaveLength(1);
    expect(pending[0].name).toBe("set_module_content");
    expect(typeof pending[0].error).toBe("string");
    expect(pending[0].error.length).toBeGreaterThan(0);

    // Turn 2: capture what gets POSTed so we can assert the system note went
    // out and that pendingToolFailures was cleared once it shipped.
    let capturedRequestBody: { history: Array<{ role: string; content: string }> } | null = null;
    const fetchTurn2 = vi.fn(async (_url: string, init?: RequestInit) => {
      capturedRequestBody = JSON.parse(String(init?.body ?? "{}")) as {
        history: Array<{ role: string; content: string }>;
      };
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

    expect(capturedRequestBody).not.toBeNull();
    const history = capturedRequestBody!.history;
    const systemNote = history.find((m) => m.role === "system");
    expect(systemNote).toBeDefined();
    expect(systemNote!.content).toMatch(/set_module_content/);
    expect(systemNote!.content.toLowerCase()).toMatch(/fail/);

    expect(store.getState().pendingToolFailures).toEqual([]);
  });

  it("a turn with all-accepted tool calls leaves pendingToolFailures empty", async () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
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
    expect(result.toolCalls[0].accepted).toBe(true);
    expect(store.getState().pendingToolFailures).toEqual([]);
  });
});
