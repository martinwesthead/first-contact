import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { encodeAnthropicSSE } from "./_helpers_REQ-36_chat_sse.js";
import { seedChatSession, type SeededChatEnv } from "./_helpers_REQ-24_chat.js";

const STATE_EDIT_TOOLS = [
  "set_module_content",
  "set_module_dial",
  "set_module_variant",
  "add_module",
  "remove_module",
  "reorder_modules",
  "set_theme_token",
  "set_site_config",
];

describe("UAT FC REQ-9: /api/chat tool list is filtered by session plan_tier", () => {
  let env: SeededChatEnv;

  beforeAll(async () => {
    env = await seedChatSession({ sessionId: "sess_req9" });
  });

  afterAll(async () => {
    await env.cleanup();
  });

  function makeMockFetch(): {
    fetch: ReturnType<typeof vi.fn>;
    capturedBodies: Array<{ tools: Array<{ name: string }> }>;
  } {
    const capturedBodies: Array<{ tools: Array<{ name: string }> }> = [];
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedBodies.push(JSON.parse(String(init?.body)));
      return new Response(encodeAnthropicSSE({ id: "msg_x", content: [] }), {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      });
    });
    return { fetch: fetchMock, capturedBodies };
  }

  function makeChatRequest(planTier: string): Request {
    return new Request("https://app.1stcontact.io/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-session-id": `sess-${planTier}`,
        "x-plan-tier": planTier,
      },
      body: JSON.stringify({
        sessionId: env.sessionId,
        userMessage: "hi",
        siteDefinition: load1stContactSite(),
        frameworkCatalog: buildFrameworkCatalog(),
      }),
    });
  }

  it("trial session: tool list includes state-edit tools and report_validation_rejection but NOT publish_stub", async () => {
    const { fetch, capturedBodies } = makeMockFetch();
    const response = await handleChatRequest(
      makeChatRequest("trial"),
      { CLAUDE_API_KEY: "k", SITES_DB: env.db },
      { fetch: fetch as unknown as typeof fetch },
    );
    expect(response.status).toBe(200);
    expect(capturedBodies).toHaveLength(1);
    const toolNames = capturedBodies[0].tools.map((t) => t.name);
    for (const t of STATE_EDIT_TOOLS) expect(toolNames).toContain(t);
    expect(toolNames).toContain("report_validation_rejection");
    expect(toolNames).not.toContain("publish_stub");
  });

  it("paid session: tool list also includes publish_stub", async () => {
    const { fetch, capturedBodies } = makeMockFetch();
    const response = await handleChatRequest(
      makeChatRequest("paid"),
      { CLAUDE_API_KEY: "k", SITES_DB: env.db },
      { fetch: fetch as unknown as typeof fetch },
    );
    expect(response.status).toBe(200);
    const toolNames = capturedBodies[0].tools.map((t) => t.name);
    expect(toolNames).toContain("publish_stub");
    for (const t of STATE_EDIT_TOOLS) expect(toolNames).toContain(t);
  });
});
