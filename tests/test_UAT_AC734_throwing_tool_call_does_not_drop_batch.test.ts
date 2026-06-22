import { describe, expect, it } from "vitest";
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

describe("UAT AC-734: a throwing tool call in a batch yields one structured ok:false result without dropping the sibling calls' results", () => {
  it("test_UAT_AC734_one_thrower_yields_one_error_result_siblings_survive", async () => {
    const site = load1stContactSite();

    // A single turn returns a batch of three tool_use blocks: two well-formed
    // state_edit calls flanking one middle call whose application is forced to
    // throw deterministically (via injected applyToolCall).
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
            // Sentinel — the injected applyToolCall throws on this call only.
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
        history: [
          { role: "user", content: "make hero medium and left-aligned" },
        ],
        siteDefinition: site,
        frameworkCatalog: buildFrameworkCatalog(),
      }),
    });
    const response = await handleChatRequest(
      request,
      { CLAUDE_API_KEY: "test-key" },
      {
        fetch: stubFetch,
        applyToolCall,
        log: (event, detail) => logEvents.push({ event, detail }),
      },
    );

    expect(response.status).toBe(200);
    const consumed = await consumeChatSSE(response);

    // The whole turn must NOT collapse to a single stream-level `error` event.
    expect(consumed.error).toBeNull();
    expect(consumed.done).not.toBeNull();

    // The `done` payload carries three tool calls: the two flanking calls are
    // ok:true, and the thrower is ok:false with a "threw" message.
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

    // Three `tool_result` SSE events fire, in dispatch order.
    expect(consumed.toolResultEvents).toHaveLength(3);
    expect(consumed.toolResultEvents[0]!.toolUseId).toBe("toolu_ok_1");
    expect(consumed.toolResultEvents[1]!.toolUseId).toBe("toolu_boom");
    expect(consumed.toolResultEvents[2]!.toolUseId).toBe("toolu_ok_2");
    expect(consumed.toolResultEvents[1]!.result.ok).toBe(false);

    // The next outbound Anthropic user message carries exactly three
    // tool_result blocks in order, with is_error:true only on the thrower.
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

    // Observability: the throw is recorded on the log as `apply_tool_call_threw`
    // and its detail names the offending tool.
    const throwLog = logEvents.find((e) => e.event === "apply_tool_call_threw");
    expect(throwLog).toBeDefined();
    expect(throwLog!.detail.tool).toBe("set_module_content");
  });
});
