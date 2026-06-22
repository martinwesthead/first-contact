import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { seedChatSession, type SeededChatEnv } from "./_helpers_REQ-24_chat.js";

describe("UAT FC REQ-24: POST /api/chat rejects bodies that still carry a `history` field", () => {
  let env: SeededChatEnv;

  beforeAll(async () => {
    env = await seedChatSession();
  });

  afterAll(async () => {
    await env.cleanup();
  });

  it("AC5: a body containing `history` is rejected with 400 — history is no longer a wire field", async () => {
    const request = new Request("https://app.1stcontact.io/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        history: [{ role: "user", content: "hi" }],
        sessionId: env.sessionId,
        userMessage: "hi",
        siteDefinition: load1stContactSite(),
        frameworkCatalog: buildFrameworkCatalog(),
      }),
    });
    const response = await handleChatRequest(
      request,
      { CLAUDE_API_KEY: "test", SITES_DB: env.db },
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/history/i);
  });
});
