import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { makeAnthropicSequenceFetch } from "./_helpers_REQ-13_anthropic.js";
import { consumeChatSSE } from "./_helpers_REQ-36_chat_sse.js";
import { seedChatSession, type SeededChatEnv } from "./_helpers_REQ-24_chat.js";

describe("UAT FC REQ-13: an invalid tool call produces a structured ok=false tool_result with a validation error matching the validator's structured output", () => {
  let env: SeededChatEnv;
  beforeAll(async () => {
    env = await seedChatSession({ sessionId: "sess_req13_err" });
  });
  afterAll(async () => {
    await env.cleanup();
  });
  it("rejects an out-of-enum dial value, returns ok:false in the tool_result, and surfaces the validator's structured error", async () => {
    const site = load1stContactSite();
    const heroInstance = site.pages[0]!.modules.find((m) => m.type === "hero")!;

    const { fetch: stubFetch, calls } = makeAnthropicSequenceFetch([
      {
        id: "msg_1",
        content: [
          {
            type: "tool_use",
            id: "toolu_bad_1",
            name: "set_module_dial",
            // 'huge' is not in the hero's declared dial enum [sm, md, lg].
            input: {
              instance_id: heroInstance.id,
              dial: "size",
              value: "huge",
            },
          },
        ],
      },
      {
        id: "msg_2",
        content: [{ type: "text", text: "I tried and it was rejected." }],
      },
    ]);

    const request = new Request("https://app.1stcontact.io/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: env.sessionId,
        userMessage: "make hero huge",
        siteDefinition: site,
        frameworkCatalog: buildFrameworkCatalog(),
      }),
    });
    const response = await handleChatRequest(
      request,
      { CLAUDE_API_KEY: "test-key", SITES_DB: env.db },
      { fetch: stubFetch },
    );
    expect(response.status).toBe(200);
    const consumed = await consumeChatSSE(response);
    expect(consumed.done).not.toBeNull();
    const body = consumed.done!;

    expect(body.toolCalls).toHaveLength(1);
    const call = body.toolCalls[0]!;
    const callResult = call.result as {
      ok: false;
      error: { tool: string; validation: Record<string, unknown> };
    };
    expect(callResult.ok).toBe(false);
    expect(callResult.error.tool).toBe("set_module_dial");
    const v = callResult.error.validation as {
      tool: string;
      path?: string;
      expected?: string[];
      got?: unknown;
      message?: string;
    };
    expect(v.message).toContain("huge");
    expect(v.expected).toEqual(expect.arrayContaining(["sm", "md", "lg"]));
    expect(v.got).toBe("huge");

    // Second Anthropic call must include the failure tool_result with is_error
    // flagged so the AI registers it as a failure to recover from.
    const blocks = calls[1]!.body.messages.at(-1) as {
      content: Array<{ type: string; is_error?: boolean; content?: string }>;
    };
    const tr = blocks.content.find((b) => b.type === "tool_result")!;
    expect(tr.is_error).toBe(true);
    const parsed = JSON.parse(tr.content!) as {
      ok: boolean;
      error?: { validation?: { message?: string } };
    };
    expect(parsed.ok).toBe(false);
    expect(parsed.error!.validation!.message).toContain("huge");
  });
});
