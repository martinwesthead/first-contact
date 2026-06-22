import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import {
  consumeChatSSE,
  encodeAnthropicSSE,
} from "./_helpers_REQ-36_chat_sse.js";
import { seedChatSession, type SeededChatEnv } from "./_helpers_REQ-24_chat.js";

describe("UAT FC REQ-8: /api/chat invokes the Anthropic Messages API and returns extracted tool calls", () => {
  let env: SeededChatEnv;

  beforeAll(async () => {
    env = await seedChatSession({ sessionId: "sess_req8_invoke" });
  });

  afterAll(async () => {
    await env.cleanup();
  });

  it("POSTs to the Anthropic endpoint with the bound API key and forwards tool_use blocks back as toolCalls", async () => {
    let callCount = 0;
    const upstreamFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      callCount++;
      expect(String(input)).toBe("https://api.anthropic.com/v1/messages");
      expect(init?.method).toBe("POST");
      const headers = new Headers(init?.headers);
      expect(headers.get("x-api-key")).toBe("test-key-abc");
      expect(headers.get("anthropic-version")).toBe("2023-06-01");
      expect(headers.get("content-type")).toBe("application/json");
      const reqBody = JSON.parse(String(init?.body));
      expect(reqBody.model).toBe("claude-sonnet-4-6");
      expect(reqBody.stream).toBe(true);
      expect(Array.isArray(reqBody.tools)).toBe(true);
      expect(reqBody.tools.map((t: { name: string }) => t.name)).toEqual(
        expect.arrayContaining([
          "set_module_content",
          "set_module_dial",
          "set_module_variant",
          "add_module",
          "remove_module",
          "reorder_modules",
          "set_theme_token",
          "set_site_config",
          // REQ-24: memory tools surface alongside builder tools.
          "search_transcripts",
          "read_session_range",
          "list_reference_docs",
          "read_reference_doc",
        ]),
      );
      expect(typeof reqBody.system).toBe("string");
      expect(reqBody.system).toContain("hero@v1");
      expect(reqBody.system).toContain("palette.primary");

      if (callCount === 1) {
        // First turn: the new server-resident-history flow primes with the
        // session tail — the freshly-appended user message must be present.
        expect(reqBody.messages.at(-1)).toEqual({
          role: "user",
          content: "Make the primary color pink.",
        });
        return new Response(
          encodeAnthropicSSE({
            id: "msg_test",
            content: [
              { type: "text", text: "Updated the primary color." },
              {
                type: "tool_use",
                id: "toolu_test_1",
                name: "set_theme_token",
                input: { name: "palette.primary", value: "#ff0099" },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "text/event-stream" } },
        );
      }
      return new Response(
        encodeAnthropicSSE({
          id: "msg_test_2",
          content: [{ type: "text", text: "Done." }],
        }),
        { status: 200, headers: { "content-type": "text/event-stream" } },
      );
    });

    const request = new Request("https://app.1stcontact.io/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: env.sessionId,
        userMessage: "Make the primary color pink.",
        siteDefinition: load1stContactSite(),
        frameworkCatalog: buildFrameworkCatalog(),
      }),
    });
    const response = await handleChatRequest(
      request,
      { CLAUDE_API_KEY: "test-key-abc", SITES_DB: env.db },
      { fetch: upstreamFetch as unknown as typeof fetch },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const consumed = await consumeChatSSE(response);
    expect(consumed.done).not.toBeNull();
    expect(consumed.text).toContain("Updated the primary color.");
    expect(consumed.done!.toolCalls).toHaveLength(1);
    expect(consumed.done!.toolCalls[0]).toMatchObject({
      name: "set_theme_token",
      input: { name: "palette.primary", value: "#ff0099" },
    });

    expect(upstreamFetch.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("returns 500 if CLAUDE_API_KEY is missing", async () => {
    const request = new Request("https://app.1stcontact.io/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: env.sessionId,
        userMessage: "hi",
        siteDefinition: load1stContactSite(),
        frameworkCatalog: buildFrameworkCatalog(),
      }),
    });
    const response = await handleChatRequest(request, {}, {});
    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/CLAUDE_API_KEY/);
  });

  it("emits an error SSE event when the upstream Anthropic call fails", async () => {
    const upstreamFetch = vi.fn(async () => {
      throw new Error("network down");
    });
    const request = new Request("https://app.1stcontact.io/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: env.sessionId,
        userMessage: "hi",
        siteDefinition: load1stContactSite(),
        frameworkCatalog: buildFrameworkCatalog(),
      }),
    });
    const response = await handleChatRequest(
      request,
      { CLAUDE_API_KEY: "test-key-abc", SITES_DB: env.db },
      { fetch: upstreamFetch as unknown as typeof fetch },
    );
    expect(response.status).toBe(200);
    const consumed = await consumeChatSSE(response);
    expect(consumed.error).toBe("upstream chat provider unreachable");
    expect(consumed.done).toBeNull();
  });
});
