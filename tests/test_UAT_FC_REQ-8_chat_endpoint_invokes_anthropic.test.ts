import { describe, expect, it, vi } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

describe("UAT FC REQ-8: /api/chat invokes the Anthropic Messages API and returns extracted tool calls", () => {
  it("POSTs to the Anthropic endpoint with the bound API key and forwards tool_use blocks back as toolCalls", async () => {
    const upstreamFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      // Verify the URL, headers, and body match Anthropic's contract.
      expect(String(input)).toBe("https://api.anthropic.com/v1/messages");
      expect(init?.method).toBe("POST");
      const headers = new Headers(init?.headers);
      expect(headers.get("x-api-key")).toBe("test-key-abc");
      expect(headers.get("anthropic-version")).toBe("2023-06-01");
      expect(headers.get("content-type")).toBe("application/json");
      const reqBody = JSON.parse(String(init?.body));
      expect(reqBody.model).toBe("claude-sonnet-4-6");
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
        ]),
      );
      expect(typeof reqBody.system).toBe("string");
      expect(reqBody.system).toContain("hero@v1");
      expect(reqBody.system).toContain("palette.primary");
      expect(reqBody.messages).toEqual([
        { role: "user", content: "Make the primary color pink." },
      ]);

      // Return a mock Anthropic message with a text block + one tool_use block.
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
        history: [{ role: "user", content: "Make the primary color pink." }],
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

    // The handler must have called the upstream API exactly once.
    expect(upstreamFetch).toHaveBeenCalledOnce();
  });

  it("returns 500 if CLAUDE_API_KEY is missing", async () => {
    const request = new Request("https://app.1stcontact.io/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        history: [{ role: "user", content: "hi" }],
        siteDefinition: load1stContactSite(),
        frameworkCatalog: buildFrameworkCatalog(),
      }),
    });
    const response = await handleChatRequest(request, {}, {});
    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/CLAUDE_API_KEY/);
  });

  it("returns 502 when the upstream Anthropic call fails", async () => {
    const upstreamFetch = vi.fn(async () => {
      throw new Error("network down");
    });
    const request = new Request("https://app.1stcontact.io/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        history: [{ role: "user", content: "hi" }],
        siteDefinition: load1stContactSite(),
        frameworkCatalog: buildFrameworkCatalog(),
      }),
    });
    const response = await handleChatRequest(
      request,
      { CLAUDE_API_KEY: "test-key-abc" },
      { fetch: upstreamFetch as unknown as typeof fetch },
    );
    expect(response.status).toBe(502);
  });
});
