import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { makeAnthropicSequenceFetch } from "./_helpers_REQ-13_anthropic.js";
import { consumeChatSSE } from "./_helpers_REQ-36_chat_sse.js";
import { seedChatSession, type SeededChatEnv } from "./_helpers_REQ-24_chat.js";

describe("UAT FC REQ-24: session title is auto-generated on the first turn, NOT on subsequent turns", () => {
  let env: SeededChatEnv;

  beforeAll(async () => {
    env = await seedChatSession({ sessionId: "sess_title" });
  });

  afterAll(async () => {
    await env.cleanup();
  });

  it("AC10: turn 1 sets a non-null title; turn 2 does not overwrite it", async () => {
    // ---- turn 1 ----
    const turn1Fetch = makeAnthropicSequenceFetch([
      { id: "msg_1", content: [{ type: "text", text: "ack." }] },
    ]);
    const turn1Resp = await handleChatRequest(
      new Request("https://app/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: env.sessionId,
          userMessage: "Help me build a vegan bakery landing page",
          siteDefinition: load1stContactSite(),
          frameworkCatalog: buildFrameworkCatalog(),
        }),
      }),
      { CLAUDE_API_KEY: "test", SITES_DB: env.db },
      { fetch: turn1Fetch.fetch },
    );
    expect(turn1Resp.status).toBe(200);
    await consumeChatSSE(turn1Resp);

    const afterTurn1 = await env.db
      .prepare("SELECT title FROM chat_sessions WHERE id = ?")
      .bind(env.sessionId)
      .first<{ title: string | null }>();
    expect(afterTurn1?.title).not.toBeNull();
    expect(afterTurn1?.title).toContain("vegan bakery");
    const firstTitle = afterTurn1!.title!;

    // ---- turn 2 ----
    const turn2Fetch = makeAnthropicSequenceFetch([
      { id: "msg_2", content: [{ type: "text", text: "ok." }] },
    ]);
    const turn2Resp = await handleChatRequest(
      new Request("https://app/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: env.sessionId,
          userMessage: "Actually, make it about cat grooming instead",
          siteDefinition: load1stContactSite(),
          frameworkCatalog: buildFrameworkCatalog(),
        }),
      }),
      { CLAUDE_API_KEY: "test", SITES_DB: env.db },
      { fetch: turn2Fetch.fetch },
    );
    expect(turn2Resp.status).toBe(200);
    await consumeChatSSE(turn2Resp);

    const afterTurn2 = await env.db
      .prepare("SELECT title FROM chat_sessions WHERE id = ?")
      .bind(env.sessionId)
      .first<{ title: string | null }>();
    expect(afterTurn2?.title).toBe(firstTitle);
  });
});
