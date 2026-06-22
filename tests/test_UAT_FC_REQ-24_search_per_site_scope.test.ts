import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { makeAnthropicSequenceFetch } from "./_helpers_REQ-13_anthropic.js";
import { consumeChatSSE } from "./_helpers_REQ-36_chat_sse.js";
import {
  insertMessage,
  insertSession,
  insertSite,
} from "./_helpers_REQ-23_db.js";
import { seedChatSession, type SeededChatEnv } from "./_helpers_REQ-24_chat.js";

describe("UAT FC REQ-24: search_transcripts is site-scoped — site A's session cannot see site B's matches", () => {
  let env: SeededChatEnv;
  const siteB = "site_other";
  const sessionB = "sess_other";
  const sharedKeyword = "GLUTENFREE-PIZZA-MENU";

  beforeAll(async () => {
    env = await seedChatSession({ siteId: "site_a", sessionId: "sess_a" });
    // Same keyword in site A's session AND site B's session.
    await insertMessage(env.db, {
      id: "msg_a_match",
      session_id: env.sessionId,
      ord: 0,
      role: "user",
      content: `tell me about ${sharedKeyword} on site A`,
    });
    await insertSite(env.db, {
      id: siteB,
      account_id: "acct_1stcontact_platform",
      slug: "other-site",
    });
    await insertSession(env.db, { id: sessionB, site_id: siteB });
    await insertMessage(env.db, {
      id: "msg_b_match",
      session_id: sessionB,
      ord: 0,
      role: "user",
      content: `${sharedKeyword} also discussed on site B`,
    });
  });

  afterAll(async () => {
    await env.cleanup();
  });

  it("AC7: search_transcripts from site A's session returns ONLY site A's match — site B's match never leaks", async () => {
    const { fetch: stubFetch, calls } = makeAnthropicSequenceFetch([
      {
        id: "msg_1",
        content: [
          {
            type: "tool_use",
            id: "toolu_search",
            name: "search_transcripts",
            input: { query: sharedKeyword },
          },
        ],
      },
      { id: "msg_2", content: [{ type: "text", text: "ack." }] },
    ]);

    const response = await handleChatRequest(
      new Request("https://app/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: env.sessionId,
          userMessage: `recall ${sharedKeyword}`,
          siteDefinition: load1stContactSite(),
          frameworkCatalog: buildFrameworkCatalog(),
        }),
      }),
      { CLAUDE_API_KEY: "test", SITES_DB: env.db },
      { fetch: stubFetch },
    );
    expect(response.status).toBe(200);
    await consumeChatSSE(response);

    // The 2nd Anthropic call's user message carries the tool_result block
    // for search_transcripts. Inspect it directly.
    const lastUserMsg = calls[1]!.body.messages.at(-1) as {
      role: string;
      content: Array<{ type: string; tool_use_id?: string; content?: string }>;
    };
    expect(lastUserMsg.role).toBe("user");
    const tr = lastUserMsg.content.find(
      (b) => b.type === "tool_result" && b.tool_use_id === "toolu_search",
    );
    expect(tr).toBeDefined();
    const parsed = JSON.parse(tr!.content!) as {
      ok: boolean;
      data?: { hits: Array<{ session_id: string }> };
    };
    expect(parsed.ok).toBe(true);
    const hitSessions = parsed.data!.hits.map((h) => h.session_id);
    expect(hitSessions).toContain(env.sessionId);
    expect(hitSessions).not.toContain(sessionB);
  });

  it("AC8: read_session_range on a different-site session returns a structured 'not found in this site' error to the model", async () => {
    const { fetch: stubFetch, calls } = makeAnthropicSequenceFetch([
      {
        id: "msg_1",
        content: [
          {
            type: "tool_use",
            id: "toolu_range",
            name: "read_session_range",
            input: { session_id: sessionB, from_ord: 0, to_ord: 5 },
          },
        ],
      },
      { id: "msg_2", content: [{ type: "text", text: "ack." }] },
    ]);
    const response = await handleChatRequest(
      new Request("https://app/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: env.sessionId,
          userMessage: "look up site B session 0-5",
          siteDefinition: load1stContactSite(),
          frameworkCatalog: buildFrameworkCatalog(),
        }),
      }),
      { CLAUDE_API_KEY: "test", SITES_DB: env.db },
      { fetch: stubFetch },
    );
    expect(response.status).toBe(200);
    await consumeChatSSE(response);
    const lastUserMsg = calls[1]!.body.messages.at(-1) as {
      content: Array<{ type: string; tool_use_id?: string; content?: string; is_error?: boolean }>;
    };
    const tr = lastUserMsg.content.find(
      (b) => b.type === "tool_result" && b.tool_use_id === "toolu_range",
    );
    expect(tr).toBeDefined();
    expect(tr!.is_error).toBe(true);
    const parsed = JSON.parse(tr!.content!) as { ok: boolean; error: string };
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toMatch(/not found in this site/);
  });
});
