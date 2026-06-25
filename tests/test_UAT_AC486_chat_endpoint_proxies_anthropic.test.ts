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

describe("UAT AC-486: POST /api/chat proxies the Anthropic Messages API and returns extracted text and tool_use blocks", () => {
  it("test_UAT_AC486_chat_endpoint_forwards_to_anthropic_and_extracts_text_and_tool_use_blocks", async () => {
    const upstreamFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      // URL + method
      expect(String(input)).toBe(ANTHROPIC_URL);
      expect(init?.method).toBe("POST");

      // Headers: x-api-key, anthropic-version, content-type
      const headers = new Headers(init?.headers);
      expect(headers.get("x-api-key")).toBe("test-key-abc");
      expect(headers.get("anthropic-version")).toBe("2023-06-01");
      expect(headers.get("content-type")).toBe("application/json");

      // Body: model, full tool surface by name, catalog-bearing system, filtered messages
      const reqBody = JSON.parse(String(init?.body));
      expect(reqBody.model).toBe("claude-sonnet-4-6");

      expect(Array.isArray(reqBody.tools)).toBe(true);
      const toolNames = reqBody.tools.map((t: { name: string }) => t.name);
      for (const required of REQUIRED_TOOL_NAMES) {
        expect(toolNames).toContain(required);
      }

      expect(typeof reqBody.system).toBe("string");
      // System prompt embeds catalog: a module id@version and a theme-token name.
      expect(reqBody.system).toContain("hero@v1");
      expect(reqBody.system).toContain("palette.primary");

      // History was filtered to user/assistant messages only — the rogue 'system'
      // role from the inbound history should NOT appear in messages.
      expect(reqBody.messages).toEqual([
        { role: "user", content: "Make the primary color pink." },
        { role: "assistant", content: "On it." },
      ]);

      return new Response(
        JSON.stringify({
          id: "msg_test",
          content: [
            { type: "text", text: "Updated the primary color." },
            {
              type: "tool_use",
              name: "set_theme_token",
              input: { name: "palette.primary", value: "#ff0099" },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

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
      toolCalls: Array<{ name: string; input: Record<string, unknown> }>;
    };
    expect(body.text).toBe("Updated the primary color.");
    expect(body.toolCalls).toEqual([
      {
        name: "set_theme_token",
        input: { name: "palette.primary", value: "#ff0099" },
      },
    ]);

    expect(upstreamFetch).toHaveBeenCalledOnce();
  });
});
