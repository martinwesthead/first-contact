import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { makeAnthropicSequenceFetch } from "./_helpers_REQ-13_anthropic.js";
import { consumeChatSSE } from "./_helpers_REQ-36_chat_sse.js";
import { seedChatSession, type SeededChatEnv } from "./_helpers_REQ-24_chat.js";

/**
 * AC-811: POST /api/chat is server-authoritative for transcript history. A
 * body that still carries a `history` field is rejected with 400 (and no
 * upstream Anthropic request is made). The accepted body is
 * {sessionId, userMessage, siteDefinition, frameworkCatalog}. Companion
 * boundary validation: non-application/json → 400, malformed JSON → 400,
 * non-object body → 400, missing/empty sessionId → 400, missing/empty
 * userMessage → 400, unbound CLAUDE_API_KEY → 500, missing SITES_DB → 500.
 */
describe("UAT AC-811: POST /api/chat rejects a body carrying a history field (400); server owns transcript history", () => {
  let env: SeededChatEnv;

  beforeAll(async () => {
    env = await seedChatSession({ sessionId: "sess_ac811" });
  });

  afterAll(async () => {
    await env.cleanup();
  });

  it("test_UAT_AC811_rejects_history_field_and_enforces_request_contract", async () => {
    const site = load1stContactSite();
    const catalog = buildFrameworkCatalog();
    const post = (body: unknown, contentType = "application/json"): Request =>
      new Request("https://app.1stcontact.io/api/chat", {
        method: "POST",
        headers: { "content-type": contentType },
        body: typeof body === "string" ? body : JSON.stringify(body),
      });

    // --- a body that still carries `history` is rejected 400, no upstream call ---
    const { fetch: stubFetch, calls } = makeAnthropicSequenceFetch([
      { id: "msg_unexpected", content: [{ type: "text", text: "should not run" }] },
    ]);
    const historyResp = await handleChatRequest(
      post({
        history: [{ role: "user", content: "hi" }],
        sessionId: env.sessionId,
        userMessage: "hi",
        siteDefinition: site,
        frameworkCatalog: catalog,
      }),
      { CLAUDE_API_KEY: "test", SITES_DB: env.db },
      { fetch: stubFetch },
    );
    expect(historyResp.status).toBe(400);
    const historyBody = (await historyResp.json()) as { error: string };
    expect(historyBody.error).toMatch(/history/i);
    // Server-authoritative: no Anthropic request fired for a rejected body.
    expect(calls.length).toBe(0);

    // --- missing sessionId → 400 ---
    const noSession = await handleChatRequest(
      post({ userMessage: "hi", siteDefinition: site, frameworkCatalog: catalog }),
      { CLAUDE_API_KEY: "test", SITES_DB: env.db },
    );
    expect(noSession.status).toBe(400);

    // --- empty sessionId → 400 ---
    const emptySession = await handleChatRequest(
      post({ sessionId: "", userMessage: "hi", siteDefinition: site, frameworkCatalog: catalog }),
      { CLAUDE_API_KEY: "test", SITES_DB: env.db },
    );
    expect(emptySession.status).toBe(400);

    // --- empty userMessage → 400 ---
    const emptyMessage = await handleChatRequest(
      post({ sessionId: env.sessionId, userMessage: "", siteDefinition: site, frameworkCatalog: catalog }),
      { CLAUDE_API_KEY: "test", SITES_DB: env.db },
    );
    expect(emptyMessage.status).toBe(400);

    // --- non-JSON content type → 400 ---
    const textPlain = await handleChatRequest(
      post(
        { sessionId: env.sessionId, userMessage: "hi", siteDefinition: site, frameworkCatalog: catalog },
        "text/plain",
      ),
      { CLAUDE_API_KEY: "test", SITES_DB: env.db },
    );
    expect(textPlain.status).toBe(400);

    // --- malformed JSON body → 400 ---
    const malformed = await handleChatRequest(
      post("{not json", "application/json"),
      { CLAUDE_API_KEY: "test", SITES_DB: env.db },
    );
    expect(malformed.status).toBe(400);

    // --- unbound CLAUDE_API_KEY → 500 ---
    const noKey = await handleChatRequest(
      post({ sessionId: env.sessionId, userMessage: "hi", siteDefinition: site, frameworkCatalog: catalog }),
      { SITES_DB: env.db },
    );
    expect(noKey.status).toBe(500);

    // --- missing SITES_DB binding → 500 ---
    const noDb = await handleChatRequest(
      post({ sessionId: env.sessionId, userMessage: "hi", siteDefinition: site, frameworkCatalog: catalog }),
      { CLAUDE_API_KEY: "test" },
    );
    expect(noDb.status).toBe(500);

    // --- a well-formed body for an existing session is accepted (not a 400) ---
    const okFetch = makeAnthropicSequenceFetch([
      { id: "msg_ok", content: [{ type: "text", text: "hello." }] },
    ]);
    const accepted = await handleChatRequest(
      post({ sessionId: env.sessionId, userMessage: "build me a page", siteDefinition: site, frameworkCatalog: catalog }),
      { CLAUDE_API_KEY: "test", SITES_DB: env.db },
      { fetch: okFetch.fetch },
    );
    expect(accepted.status).toBe(200);
    expect(accepted.status).not.toBe(400);
    const consumed = await consumeChatSSE(accepted);
    expect(consumed.error).toBeNull();
  });
});
