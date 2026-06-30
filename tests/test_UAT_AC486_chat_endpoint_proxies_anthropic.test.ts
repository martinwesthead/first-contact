import { afterEach, describe, expect, it } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import {
  consumeChatSSE,
  makeAnthropicStreamingFetch,
} from "./_helpers_REQ-36_chat_sse.js";
import { insertMessage } from "./_helpers_REQ-23_db.js";
import { seedChatSession, type SeededChatEnv } from "./_helpers_REQ-24_chat.js";

/**
 * AC-486 (server-resident, REQ-24/REQ-36): POST /api/chat runs the multi-turn
 * Anthropic tool loop and re-emits the turn to the browser as a Server-Sent
 * Events stream (token / tool_call / tool_result / done / error). The transcript
 * is server-resident: the client sends {sessionId, userMessage, ...}; the server
 * appends the new user message and primes Anthropic from the stored session tail
 * (user/assistant only — system rows are filtered). The tool surface is derived
 * from the OPERATOR_ACTIONS registry filtered by plan tier (default trial), the
 * upstream request carries `stream: true`, and the system-prompt site snapshot is
 * recomputed each turn from the working definition.
 */

const REQUIRED_TOOL_NAMES = [
  "set_module_content",
  "set_module_dial",
  "set_module_variant",
  "add_module",
  "remove_module",
  "reorder_modules",
  "set_theme_token",
  "set_site_config",
];

interface MsgBlock {
  type: string;
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
}
interface Msg {
  role: string;
  content: string | MsgBlock[];
}

function findToolResult(messages: Msg[]): MsgBlock {
  for (const m of messages) {
    if (!Array.isArray(m.content)) continue;
    const block = m.content.find((b) => b.type === "tool_result");
    if (block) return block;
  }
  throw new Error("no tool_result block found on the message list");
}

describe("UAT AC-486: POST /api/chat streams the Anthropic turn to the browser as Server-Sent Events", () => {
  let env: SeededChatEnv;

  afterEach(async () => {
    if (env) await env.cleanup();
  });

  it("test_UAT_AC486_chat_endpoint_streams_sse_token_tool_call_tool_result_done", async () => {
    env = await seedChatSession({ sessionId: "sess_ac486_a" });
    // Prior turn lives server-side: the server primes Anthropic from this tail
    // (user/assistant only — the system row is filtered out of the prompt).
    await insertMessage(env.db, {
      id: "m_a0",
      session_id: env.sessionId,
      ord: 0,
      role: "user",
      content: "Make the primary color pink.",
      ts: 1_700_000_000_000,
    });
    await insertMessage(env.db, {
      id: "m_a1",
      session_id: env.sessionId,
      ord: 1,
      role: "assistant",
      content: "On it.",
      ts: 1_700_000_000_001,
    });
    await insertMessage(env.db, {
      id: "m_a2",
      session_id: env.sessionId,
      ord: 2,
      role: "system",
      content: "internal note",
      ts: 1_700_000_000_002,
    });

    // Upstream streams a tool_use (a valid state-edit) then a terminating
    // text turn. The handler executes the tool server-side and re-emits SSE.
    const { fetch: stubFetch, calls } = makeAnthropicStreamingFetch([
      {
        id: "msg_1",
        content: [
          {
            type: "tool_use",
            id: "toolu_1",
            name: "set_theme_token",
            input: { name: "palette.primary", value: "#ff0099" },
          },
        ],
      },
      {
        id: "msg_2",
        content: [{ type: "text", text: "Updated the primary color." }],
      },
    ]);

    const request = new Request("https://app.1stcontact.io/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: env.sessionId,
        userMessage: "Now make it pinker.",
        siteDefinition: load1stContactSite(),
        frameworkCatalog: buildFrameworkCatalog(),
      }),
    });

    const response = await handleChatRequest(
      request,
      { CLAUDE_API_KEY: "test-key-abc", SITES_DB: env.db },
      { fetch: stubFetch },
    );

    // (2) The response is an SSE stream, not a JSON block.
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");

    const consumed = await consumeChatSSE(response);

    // (1) The first upstream request carries stream:true, the registry-derived
    //     tool list (default trial → the eight state-edit tools), and a system
    //     prompt embedding the catalog (module id@version + theme-token name).
    expect(calls).toHaveLength(2);
    const first = calls[0]!.body;
    expect(first.stream).toBe(true);
    const toolNames = (first.tools as Array<{ name: string }>).map(
      (t) => t.name,
    );
    for (const required of REQUIRED_TOOL_NAMES) {
      expect(toolNames).toContain(required);
    }
    expect(first.system).toContain("hero@v1");
    expect(first.system).toContain("palette.primary");
    // First turn sees the ORIGINAL working site (primary #2563eb).
    expect(first.system).toContain("#2563eb");
    // Server-resident priming: the stored tail (user/assistant only — the
    // 'system' note is filtered) primes Anthropic, and the just-sent user
    // message is appended as the final turn.
    expect(first.messages).toEqual([
      { role: "user", content: "Make the primary color pink." },
      { role: "assistant", content: "On it." },
      { role: "user", content: "Now make it pinker." },
    ]);

    // (2) token events for the text deltas, a tool_call event for the call,
    //     and a tool_result event with ok:true and a non-empty summary.
    expect(consumed.text).toBe("Updated the primary color.");
    expect(consumed.tokenDeltas.length).toBeGreaterThan(0);
    expect(consumed.toolCallEvents).toHaveLength(1);
    expect(consumed.toolCallEvents[0]!.name).toBe("set_theme_token");
    expect(consumed.toolResultEvents).toHaveLength(1);
    const tr = consumed.toolResultEvents[0]!;
    expect(tr.name).toBe("set_theme_token");
    expect(tr.result.ok).toBe(true);
    if (tr.result.ok) {
      expect(typeof tr.result.applied.summary).toBe("string");
      expect(tr.result.applied.summary.length).toBeGreaterThan(0);
    }

    // (3) The second upstream request carries the tool_result block and a
    //     system prompt recomputed from the POST-edit working site.
    const second = calls[1]!.body;
    const toolResultBlock = findToolResult(second.messages as Msg[]);
    expect(toolResultBlock.tool_use_id).toBe("toolu_1");
    expect(second.system).toContain("#ff0099");
    expect(second.system).not.toContain("#2563eb");

    // (4) A final done event carries the joined text and the executed call
    //     with its structured result.
    expect(consumed.done).not.toBeNull();
    expect(consumed.done!.text).toBe("Updated the primary color.");
    expect(consumed.done!.toolCalls).toHaveLength(1);
    const doneCall = consumed.done!.toolCalls[0]!;
    expect(doneCall.name).toBe("set_theme_token");
    expect(doneCall.input).toEqual({
      name: "palette.primary",
      value: "#ff0099",
    });
    expect(doneCall.result.ok).toBe(true);
    // The tool_result block fed back to Anthropic carries the structured result.
    expect(String(toolResultBlock.content)).toContain("ok");
  });

  it("test_UAT_AC486_rejected_tool_call_is_flagged_is_error_and_leaves_working_site_unchanged", async () => {
    env = await seedChatSession({ sessionId: "sess_ac486_b" });
    const { fetch: stubFetch, calls } = makeAnthropicStreamingFetch([
      {
        id: "msg_bad",
        content: [
          {
            type: "tool_use",
            id: "toolu_bad",
            name: "set_theme_token",
            // A token name NOT in the catalog contract → rejected.
            input: { name: "palette.__nonexistent__", value: "#000000" },
          },
        ],
      },
      {
        id: "msg_done",
        content: [{ type: "text", text: "That theme token isn't available." }],
      },
    ]);

    const request = new Request("https://app.1stcontact.io/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: env.sessionId,
        userMessage: "Set primary via a bad token.",
        siteDefinition: load1stContactSite(),
        frameworkCatalog: buildFrameworkCatalog(),
      }),
    });

    const response = await handleChatRequest(
      request,
      { CLAUDE_API_KEY: "test-key-abc", SITES_DB: env.db },
      { fetch: stubFetch },
    );
    expect(response.status).toBe(200);
    const consumed = await consumeChatSSE(response);

    // A rejected tool call produces a tool_result event with ok:false.
    expect(consumed.toolResultEvents).toHaveLength(1);
    expect(consumed.toolResultEvents[0]!.result.ok).toBe(false);

    // The block returned to Anthropic is flagged is_error and the working
    // site is unchanged (original primary present, rejected value never lands).
    expect(calls).toHaveLength(2);
    const second = calls[1]!.body;
    const toolResultBlock = findToolResult(second.messages as Msg[]);
    expect(toolResultBlock.is_error).toBe(true);
    expect(second.system).toContain("#2563eb");
    expect(second.system).not.toContain("#000000");

    expect(consumed.done!.toolCalls[0]!.result.ok).toBe(false);
  });
});
