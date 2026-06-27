import { describe, expect, it, vi } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

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

interface AnthropicBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
}
interface AnthropicMessage {
  role: string;
  content: string | AnthropicBlock[];
}

function anthropicResponse(content: AnthropicBlock[]): Response {
  return new Response(JSON.stringify({ id: "msg_test", content }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

/** Locate the single `tool_result` block on the message list (the loop pushes
 *  it as a user-role turn after executing a tool_use). */
function findToolResult(messages: AnthropicMessage[]): AnthropicBlock {
  for (const m of messages) {
    if (!Array.isArray(m.content)) continue;
    const block = m.content.find((b) => b.type === "tool_result");
    if (block) return block;
  }
  throw new Error("no tool_result block found on the message list");
}

describe("UAT AC-486: POST /api/chat runs the multi-turn Anthropic tool loop, executes tool_use blocks server-side, and returns extracted text and tool calls", () => {
  it("test_UAT_AC486_chat_endpoint_forwards_to_anthropic_and_extracts_text_and_tool_use_blocks", async () => {
    let turn = 0;
    const upstreamFetch = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const current = turn++;

        // --- Forwarding contract: identical on every turn. ---
        expect(String(input)).toBe(ANTHROPIC_URL);
        expect(init?.method).toBe("POST");
        const headers = new Headers(init?.headers);
        expect(headers.get("x-api-key")).toBe("test-key-abc");
        expect(headers.get("anthropic-version")).toBe("2023-06-01");
        expect(headers.get("content-type")).toBe("application/json");

        const reqBody = JSON.parse(String(init?.body));
        expect(reqBody.model).toBe("claude-sonnet-4-6");

        // Tool surface derived from the registry, filtered by plan tier
        // (default trial) — the full eight state-edit tools are visible.
        expect(Array.isArray(reqBody.tools)).toBe(true);
        const toolNames = reqBody.tools.map((t: { name: string }) => t.name);
        for (const required of REQUIRED_TOOL_NAMES) {
          expect(toolNames).toContain(required);
        }

        // System prompt embeds the catalog (module id@version + token name).
        expect(typeof reqBody.system).toBe("string");
        expect(reqBody.system).toContain("hero@v1");
        expect(reqBody.system).toContain("palette.primary");

        if (current === 0) {
          // History filtered to user/assistant only — the rogue 'system'
          // role from the inbound history is dropped.
          expect(reqBody.messages).toEqual([
            { role: "user", content: "Make the primary color pink." },
            { role: "assistant", content: "On it." },
          ]);
          // First turn sees the ORIGINAL working site (primary #2563eb).
          expect(reqBody.system).toContain("#2563eb");

          // Model asks to set the primary theme token.
          return anthropicResponse([
            {
              type: "tool_use",
              id: "toolu_1",
              name: "set_theme_token",
              input: { name: "palette.primary", value: "#ff0099" },
            },
          ]);
        }

        // --- Second turn: the executed tool_result is on the message list. ---
        const toolResult = findToolResult(reqBody.messages as AnthropicMessage[]);
        expect(toolResult.tool_use_id).toBe("toolu_1");
        const parsed = JSON.parse(String(toolResult.content)) as {
          ok: boolean;
          applied?: { summary?: unknown };
        };
        expect(parsed.ok).toBe(true);
        expect(typeof parsed.applied?.summary).toBe("string");
        expect((parsed.applied?.summary as string).length).toBeGreaterThan(0);

        // State recomputed: the post-edit site (primary #ff0099) is reflected
        // in this turn's system prompt, and the original value is gone.
        expect(reqBody.system).toContain("#ff0099");
        expect(reqBody.system).not.toContain("#2563eb");

        // Model finishes with a text-only turn → the loop terminates.
        return anthropicResponse([
          { type: "text", text: "Updated the primary color." },
        ]);
      },
    );

    const request = new Request("https://app.1stcontact.io/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        history: [
          { role: "user", content: "Make the primary color pink." },
          { role: "assistant", content: "On it." },
          // Should be filtered out of the upstream request.
          { role: "system", content: "internal note" },
        ],
        siteDefinition: load1stContactSite(),
        frameworkCatalog: buildFrameworkCatalog(),
      }),
    });

    const response = await handleChatRequest(
      request,
      { CLAUDE_API_KEY: "test-key-abc" },
      { fetch: upstreamFetch as unknown as typeof fetch },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      text: string;
      toolCalls: Array<{
        name: string;
        input: Record<string, unknown>;
        result: {
          ok: boolean;
          applied?: { tool: string; args: Record<string, unknown>; summary: string };
        };
      }>;
    };

    // text is joined from the text content blocks across turns.
    expect(body.text).toBe("Updated the primary color.");

    // toolCalls carries the executed call WITH its structured result.
    expect(body.toolCalls).toHaveLength(1);
    const call = body.toolCalls[0];
    expect(call.name).toBe("set_theme_token");
    expect(call.input).toEqual({ name: "palette.primary", value: "#ff0099" });
    expect(call.result.ok).toBe(true);
    expect(call.result.applied?.tool).toBe("set_theme_token");
    expect(call.result.applied?.args).toEqual({
      name: "palette.primary",
      value: "#ff0099",
    });
    expect(call.result.applied?.summary).toBe(
      "set theme token 'palette.primary' to '#ff0099'",
    );

    // Two upstream calls: the tool turn and the terminating text turn.
    expect(upstreamFetch).toHaveBeenCalledTimes(2);
  });

  it("test_UAT_AC486_rejected_tool_call_is_flagged_is_error_and_leaves_working_site_unchanged", async () => {
    let turn = 0;
    const upstreamFetch = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const current = turn++;
        const reqBody = JSON.parse(String(init?.body));

        if (current === 0) {
          expect(reqBody.system).toContain("#2563eb");
          // A token name that is NOT in the catalog contract → rejected.
          return anthropicResponse([
            {
              type: "tool_use",
              id: "toolu_bad",
              name: "set_theme_token",
              input: { name: "palette.__nonexistent__", value: "#000000" },
            },
          ]);
        }

        // The rejected tool_result is flagged is_error on the Anthropic block
        // and carries ok:false; the working site is untouched.
        const toolResult = findToolResult(reqBody.messages as AnthropicMessage[]);
        expect(toolResult.is_error).toBe(true);
        const parsed = JSON.parse(String(toolResult.content)) as {
          ok: boolean;
          error?: { tool?: string };
        };
        expect(parsed.ok).toBe(false);
        expect(parsed.error?.tool).toBe("set_theme_token");

        // Working site unchanged: original primary still present, the rejected
        // value never landed.
        expect(reqBody.system).toContain("#2563eb");
        expect(reqBody.system).not.toContain("#000000");

        return anthropicResponse([
          { type: "text", text: "That theme token isn't available." },
        ]);
      },
    );

    const request = new Request("https://app.1stcontact.io/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        history: [{ role: "user", content: "Set primary via a bad token." }],
        siteDefinition: load1stContactSite(),
        frameworkCatalog: buildFrameworkCatalog(),
      }),
    });

    const response = await handleChatRequest(
      request,
      { CLAUDE_API_KEY: "test-key-abc" },
      { fetch: upstreamFetch as unknown as typeof fetch },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      toolCalls: Array<{
        name: string;
        result: { ok: boolean; error?: { tool?: string } };
      }>;
    };
    expect(body.toolCalls).toHaveLength(1);
    expect(body.toolCalls[0].name).toBe("set_theme_token");
    expect(body.toolCalls[0].result.ok).toBe(false);
    expect(body.toolCalls[0].result.error?.tool).toBe("set_theme_token");
    expect(upstreamFetch).toHaveBeenCalledTimes(2);
  });
});
