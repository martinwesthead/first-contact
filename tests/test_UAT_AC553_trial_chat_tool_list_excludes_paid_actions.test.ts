import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { consumeChatSSE } from "./_helpers_REQ-36_chat_sse.js";
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

let env: SeededChatEnv;

beforeAll(async () => {
  env = await seedChatSession({ sessionId: "sess_ac553" });
});

afterAll(async () => {
  await env.cleanup();
});

function makeChatRequest(headers: Record<string, string>): Request {
  return new Request("https://app.1stcontact.io/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      sessionId: env.sessionId,
      userMessage: "hi",
      siteDefinition: load1stContactSite(),
      frameworkCatalog: buildFrameworkCatalog(),
    }),
  });
}

function makeMockFetch(): {
  fetch: ReturnType<typeof vi.fn>;
  capturedBodies: Array<{ tools: Array<{ name: string }> }>;
} {
  const capturedBodies: Array<{ tools: Array<{ name: string }> }> = [];
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    capturedBodies.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ id: "msg_x", content: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  return { fetch: fetchMock, capturedBodies };
}

describe("UAT AC-553: Trial-plan chat session is offered state-edit tools but no paid-tier system-action tools", () => {
  it("test_UAT_AC553_trial_session_tool_list_includes_state_edit_tools_and_excludes_publish_stub", async () => {
    // Variant 1: no x-plan-tier header (defaults to trial).
    const defaulted = makeMockFetch();
    const defaultedResponse = await handleChatRequest(
      makeChatRequest({}),
      { CLAUDE_API_KEY: "test-key-abc", SITES_DB: env.db },
      { fetch: defaulted.fetch as unknown as typeof fetch, log: () => {} },
    );
    expect(defaultedResponse.status).toBe(200);
    await consumeChatSSE(defaultedResponse);
    expect(defaulted.capturedBodies).toHaveLength(1);
    const defaultedToolNames = defaulted.capturedBodies[0].tools.map((t) => t.name);
    for (const tool of STATE_EDIT_TOOLS) {
      expect(defaultedToolNames).toContain(tool);
    }
    expect(defaultedToolNames).not.toContain("publish_stub");

    // Variant 2: explicit x-plan-tier: trial header.
    const explicit = makeMockFetch();
    const explicitResponse = await handleChatRequest(
      makeChatRequest({ "x-plan-tier": "trial" }),
      { CLAUDE_API_KEY: "test-key-abc", SITES_DB: env.db },
      { fetch: explicit.fetch as unknown as typeof fetch, log: () => {} },
    );
    expect(explicitResponse.status).toBe(200);
    await consumeChatSSE(explicitResponse);
    expect(explicit.capturedBodies).toHaveLength(1);
    const explicitToolNames = explicit.capturedBodies[0].tools.map((t) => t.name);
    for (const tool of STATE_EDIT_TOOLS) {
      expect(explicitToolNames).toContain(tool);
    }
    expect(explicitToolNames).not.toContain("publish_stub");

    // The default-trial and explicit-trial paths must produce the same tool list.
    expect(explicitToolNames.sort()).toEqual(defaultedToolNames.sort());
  });
});
