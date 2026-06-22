import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import {
  applyToolCall as realApplyToolCall,
  type ToolCall,
} from "@gendev/builder-ui/tools";
import { buildFrameworkCatalog } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import {
  consumeChatSSE,
  makeAnthropicStreamingFetch,
} from "./_helpers_REQ-36_chat_sse.js";
import { seedChatSession, type SeededChatEnv } from "./_helpers_REQ-24_chat.js";

describe("UAT FC REQ-38: a throwing state_edit tool call does not drop the rest of the batch", () => {
  let env: SeededChatEnv;
  beforeAll(async () => {
    env = await seedChatSession({ sessionId: "sess_req38" });
  });
  afterAll(async () => {
    await env.cleanup();
  });
  it("a 3-call batch with one thrower still produces 3 tool_results — 2 ok and 1 structured error — and the rest of the batch survives", async () => {
    const site = load1stContactSite();

    const { fetch: stubFetch, calls } = makeAnthropicStreamingFetch([
      {
        id: "msg_1",
        content: [
          {
            type: "tool_use",
            id: "toolu_ok_1",
            name: "set_module_dial",
            input: { instance_id: "hero", dial: "size", value: "md" },
          },
          {
            type: "tool_use",
            id: "toolu_boom",
            name: "set_module_content",
            // Sentinel — the injected applyToolCall throws on this.
            input: { instance_id: "BOOM", field: "heading", value: "x" },
          },
          {
            type: "tool_use",
            id: "toolu_ok_2",
            name: "set_module_dial",
            input: { instance_id: "hero", dial: "align", value: "left" },
          },
        ],
      },
      {
        id: "msg_2",
        content: [{ type: "text", text: "Two of three landed." }],
      },
    ]);

    const applyToolCall = ((s, c, call: ToolCall) => {
      const input = call.input as { instance_id?: unknown };
      if (input.instance_id === "BOOM") {
        throw new Error("synthetic apply failure");
      }
      return realApplyToolCall(s, c, call);
    }) as typeof realApplyToolCall;

    const logEvents: Array<{ event: string; detail: Record<string, unknown> }> =
      [];
    const request = new Request("https://app.1stcontact.io/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: env.sessionId,
        userMessage: "make hero medium and left-aligned",
        siteDefinition: site,
        frameworkCatalog: buildFrameworkCatalog(),
      }),
    });
    const response = await handleChatRequest(
      request,
      { CLAUDE_API_KEY: "test-key", SITES_DB: env.db },
      {
        fetch: stubFetch,
        applyToolCall,
        log: (event, detail) => logEvents.push({ event, detail }),
      },
    );

    expect(response.status).toBe(200);
    const consumed = await consumeChatSSE(response);

    // The whole-stream `error` event is what the bug used to emit — a single
    // thrower must NOT collapse the stream now.
    expect(consumed.error).toBeNull();
    expect(consumed.done).not.toBeNull();

    const toolCalls = consumed.done!.toolCalls;
    expect(toolCalls).toHaveLength(3);
    expect(toolCalls[0]!.result.ok).toBe(true);
    expect(toolCalls[2]!.result.ok).toBe(true);

    const errCall = toolCalls[1]!;
    expect(errCall.result.ok).toBe(false);
    if (errCall.result.ok) throw new Error("unreachable");
    const validation = errCall.result.error.validation as { message?: string };
    expect(validation.message).toContain("threw");
    expect(validation.message).toContain("synthetic apply failure");

    // SSE tool_result events should have fired for ALL three, in order — this
    // is the AI's per-call feedback mechanism the ticket is about.
    expect(consumed.toolResultEvents).toHaveLength(3);
    expect(consumed.toolResultEvents[0]!.toolUseId).toBe("toolu_ok_1");
    expect(consumed.toolResultEvents[1]!.toolUseId).toBe("toolu_boom");
    expect(consumed.toolResultEvents[2]!.toolUseId).toBe("toolu_ok_2");
    expect(consumed.toolResultEvents[1]!.result.ok).toBe(false);

    // The next Anthropic turn must carry exactly 3 tool_result blocks in the
    // last user message, in order, with is_error: true only on the thrower —
    // so the AI can self-correct on the next round.
    const lastUserMsg = calls[1]!.body.messages.at(-1) as {
      role: string;
      content: Array<{
        type: string;
        tool_use_id?: string;
        is_error?: boolean;
        content?: string;
      }>;
    };
    expect(lastUserMsg.role).toBe("user");
    const toolResults = lastUserMsg.content.filter(
      (b) => b.type === "tool_result",
    );
    expect(toolResults).toHaveLength(3);
    expect(toolResults[0]!.tool_use_id).toBe("toolu_ok_1");
    expect(toolResults[1]!.tool_use_id).toBe("toolu_boom");
    expect(toolResults[2]!.tool_use_id).toBe("toolu_ok_2");
    expect(toolResults[0]!.is_error).toBeUndefined();
    expect(toolResults[1]!.is_error).toBe(true);
    expect(toolResults[2]!.is_error).toBeUndefined();

    // Observability: the throw must be logged so a real production occurrence
    // shows up in tail logs.
    const throwLog = logEvents.find((e) => e.event === "apply_tool_call_threw");
    expect(throwLog).toBeDefined();
    expect(throwLog!.detail.tool).toBe("set_module_content");
  });
});
