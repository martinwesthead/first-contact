import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { makeAnthropicSequenceFetch } from "./_helpers_REQ-13_anthropic.js";
import { consumeChatSSE } from "./_helpers_REQ-36_chat_sse.js";
import { seedChatSession, type SeededChatEnv } from "./_helpers_REQ-24_chat.js";

/**
 * AC-814: on a session's FIRST user turn the server derives a one-line title
 * from the user message — whitespace collapsed/trimmed, truncated to 60 chars
 * with a trailing ellipsis when longer — and persists it. Subsequent turns do
 * not regenerate it. A message that collapses to empty yields no title update.
 */
const MAX_TITLE_CHARS = 60;

// Mirror of the production deriveTitleFromMessage so we can assert the exact
// stored title rather than a loose substring.
function expectedTitle(message: string): string {
  const collapsed = message.replace(/\s+/g, " ").trim();
  if (collapsed.length <= MAX_TITLE_CHARS) return collapsed;
  return `${collapsed.slice(0, MAX_TITLE_CHARS - 1).trimEnd()}…`;
}

describe("UAT AC-814: first user turn auto-derives and persists a one-line session title; later turns do not regenerate it", () => {
  let env: SeededChatEnv;

  beforeAll(async () => {
    env = await seedChatSession({ sessionId: "sess_ac814" });
  });

  afterAll(async () => {
    await env.cleanup();
  });

  it("test_UAT_AC814_first_turn_title_collapsed_truncated_then_stable_and_empty_skips", async () => {
    const site = load1stContactSite();
    const catalog = buildFrameworkCatalog();
    const titleOf = async (sessionId: string): Promise<string | null> => {
      const row = await env.db
        .prepare("SELECT title FROM chat_sessions WHERE id = ?")
        .bind(sessionId)
        .first<{ title: string | null }>();
      return row?.title ?? null;
    };
    const runTurn = async (sessionId: string, userMessage: string): Promise<void> => {
      const { fetch: stubFetch } = makeAnthropicSequenceFetch([
        { id: "msg_done", content: [{ type: "text", text: "ack." }] },
      ]);
      const response = await handleChatRequest(
        new Request("https://app/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId, userMessage, siteDefinition: site, frameworkCatalog: catalog }),
        }),
        { CLAUDE_API_KEY: "test", SITES_DB: env.db },
        { fetch: stubFetch },
      );
      expect(response.status).toBe(200);
      await consumeChatSSE(response);
    };

    // --- first turn: long, whitespace-laden message → collapsed + truncated ---
    const firstMessage =
      "Help me build   a\tvegan\n\nbakery landing page with lots of extra descriptive words here";
    const expected = expectedTitle(firstMessage);
    // sanity: this message is genuinely long enough to be truncated.
    expect(expected.length).toBe(MAX_TITLE_CHARS);
    expect(expected.endsWith("…")).toBe(true);
    expect(expected).not.toMatch(/\s{2,}/); // internal whitespace normalised
    expect(expected).not.toMatch(/[\t\n]/);

    expect(await titleOf(env.sessionId)).toBeNull();
    await runTurn(env.sessionId, firstMessage);
    const afterTurn1 = await titleOf(env.sessionId);
    expect(afterTurn1).toBe(expected);

    // --- second turn: title is NOT regenerated ---
    await runTurn(env.sessionId, "Actually, make it about cat grooming instead");
    expect(await titleOf(env.sessionId)).toBe(expected);

    // --- a fresh session whose first message collapses to empty: no title ---
    const blankEnv = await seedChatSession({
      siteId: "site_ac814_blank",
      sessionId: "sess_ac814_blank",
    });
    try {
      // Whitespace-only but non-empty string passes the wire contract, yet
      // collapses to "" so no title is written.
      await handleChatRequest(
        new Request("https://app/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionId: blankEnv.sessionId,
            userMessage: "   \n\t  ",
            siteDefinition: site,
            frameworkCatalog: catalog,
          }),
        }),
        { CLAUDE_API_KEY: "test", SITES_DB: blankEnv.db },
        { fetch: makeAnthropicSequenceFetch([{ id: "m", content: [{ type: "text", text: "ok." }] }]).fetch },
      ).then(consumeChatSSE);
      const blankTitle = await blankEnv.db
        .prepare("SELECT title FROM chat_sessions WHERE id = ?")
        .bind(blankEnv.sessionId)
        .first<{ title: string | null }>();
      expect(blankTitle?.title ?? null).toBeNull();
    } finally {
      await blankEnv.cleanup();
    }
  });
});
