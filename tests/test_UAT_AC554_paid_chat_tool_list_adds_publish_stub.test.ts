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
  env = await seedChatSession({ sessionId: "sess_ac554" });
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

describe("UAT AC-554: Paid-plan chat session additionally receives paid-tier system-action tools in its Anthropic tool list", () => {
  it("test_UAT_AC554_paid_session_tool_list_is_strict_superset_of_trial_and_includes_publish_stub", async () => {
    // Paid session: must include every state-edit tool AND publish_stub.
    const paid = makeMockFetch();
    const paidResponse = await handleChatRequest(
      makeChatRequest({ "x-plan-tier": "paid" }),
      { CLAUDE_API_KEY: "test-key-abc", SITES_DB: env.db },
      { fetch: paid.fetch as unknown as typeof fetch, log: () => {} },
    );
    expect(paidResponse.status).toBe(200);
    await consumeChatSSE(paidResponse);
    expect(paid.capturedBodies).toHaveLength(1);
    const paidToolNames = paid.capturedBodies[0].tools.map((t) => t.name);
    for (const tool of STATE_EDIT_TOOLS) {
      expect(paidToolNames).toContain(tool);
    }
    expect(paidToolNames).toContain("publish_stub");

    // Parallel trial-tier request: publish_stub must be absent.
    const trial = makeMockFetch();
    const trialResponse = await handleChatRequest(
      makeChatRequest({ "x-plan-tier": "trial" }),
      { CLAUDE_API_KEY: "test-key-abc", SITES_DB: env.db },
      { fetch: trial.fetch as unknown as typeof fetch, log: () => {} },
    );
    expect(trialResponse.status).toBe(200);
    await consumeChatSSE(trialResponse);
    expect(trial.capturedBodies).toHaveLength(1);
    const trialToolNames = trial.capturedBodies[0].tools.map((t) => t.name);
    expect(trialToolNames).not.toContain("publish_stub");

    // Strict superset: every tool visible to trial must also appear to paid.
    for (const tool of trialToolNames) {
      expect(paidToolNames).toContain(tool);
    }
    // And paid has at least one tool that trial does not.
    const paidOnly = paidToolNames.filter((n) => !trialToolNames.includes(n));
    expect(paidOnly).toContain("publish_stub");
  });
});
