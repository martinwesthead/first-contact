import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { makeAnthropicSequenceFetch } from "./_helpers_REQ-13_anthropic.js";
import { consumeChatSSE } from "./_helpers_REQ-36_chat_sse.js";
import { insertMessage } from "./_helpers_REQ-23_db.js";
import { seedChatSession, type SeededChatEnv } from "./_helpers_REQ-24_chat.js";

/**
 * AC-812: for an accepted turn the server appends the new user message to the
 * session, then primes Anthropic from the session TAIL (the contiguous
 * most-recent run of stored messages whose cumulative length first reaches
 * CHAT_TAIL_CHARS — default 5000, overridable; non-numeric/non-positive falls
 * back to the default) rather than the whole transcript. The tail is presented
 * oldest-first, user/assistant only, and always ends with the just-sent
 * message.
 */
describe("UAT AC-812: Anthropic is primed with the session tail (>= CHAT_TAIL_CHARS, default 5000), not the whole transcript", () => {
  let env: SeededChatEnv;

  beforeAll(async () => {
    env = await seedChatSession({ sessionId: "sess_ac812" });
    // 200 messages of ~80 chars, each carrying a unique ordinal tag.
    for (let i = 0; i < 200; i++) {
      await insertMessage(env.db, {
        id: `msg_ac812_${i}`,
        session_id: env.sessionId,
        ord: i,
        role: i % 2 === 0 ? "user" : "assistant",
        content: `MSG${i.toString().padStart(3, "0")} — ` + "x".repeat(72),
        ts: 1_700_000_000_000 + i * 1000,
      });
    }
  });

  afterAll(async () => {
    await env.cleanup();
  });

  it("test_UAT_AC812_primes_from_tail_with_default_override_and_nonnumeric_fallback", async () => {
    const site = load1stContactSite();
    const catalog = buildFrameworkCatalog();

    const runTurn = async (
      probe: string,
      tailChars: string | undefined,
    ): Promise<Array<{ role: string; content: string }>> => {
      const { fetch: stubFetch, calls } = makeAnthropicSequenceFetch([
        { id: "msg_done", content: [{ type: "text", text: "ok." }] },
      ]);
      const response = await handleChatRequest(
        new Request("https://app/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionId: env.sessionId,
            userMessage: probe,
            siteDefinition: site,
            frameworkCatalog: catalog,
          }),
        }),
        { CLAUDE_API_KEY: "test", SITES_DB: env.db, CHAT_TAIL_CHARS: tailChars },
        { fetch: stubFetch },
      );
      expect(response.status).toBe(200);
      const consumed = await consumeChatSSE(response);
      expect(consumed.error).toBeNull();
      return calls[0]!.body.messages as Array<{ role: string; content: string }>;
    };

    const tagsOf = (primed: Array<{ content: string }>): number[] =>
      primed
        .map((m) => m.content.match(/^MSG(\d{3})/))
        .filter((m): m is RegExpMatchArray => m !== null)
        .map((m) => Number(m[1]));

    // --- default budget (CHAT_TAIL_CHARS unset → 5000) ---
    const primedDefault = await runTurn("PROBE_DEFAULT", undefined);
    // (a) ends with the just-sent user message.
    expect(primedDefault.at(-1)?.role).toBe("user");
    expect(primedDefault.at(-1)?.content).toBe("PROBE_DEFAULT");
    // (b) only the most-recent slice that first reaches the budget — newest
    // present, head omitted.
    const concatDefault = primedDefault.map((m) => m.content).join("\n");
    expect(concatDefault.length).toBeGreaterThanOrEqual(5000);
    expect(concatDefault).toContain("MSG199");
    expect(concatDefault).toContain("MSG150");
    expect(concatDefault).not.toContain("MSG000");
    expect(concatDefault).not.toContain("MSG050");
    // (c) ordered oldest-to-newest (tags non-decreasing).
    const defaultTags = tagsOf(primedDefault);
    for (let i = 1; i < defaultTags.length; i++) {
      expect(defaultTags[i]!).toBeGreaterThan(defaultTags[i - 1]!);
    }
    // contiguous (no gaps) within the tail.
    for (let i = 1; i < defaultTags.length; i++) {
      expect(defaultTags[i]! - defaultTags[i - 1]!).toBe(1);
    }

    // --- non-numeric CHAT_TAIL_CHARS falls back to the 5000 default ---
    const primedNonNumeric = await runTurn("PROBE_NAN", "not-a-number");
    const concatNonNumeric = primedNonNumeric.map((m) => m.content).join("\n");
    expect(concatNonNumeric.length).toBeGreaterThanOrEqual(5000);
    expect(concatNonNumeric).toContain("MSG150");
    expect(primedNonNumeric.at(-1)?.content).toBe("PROBE_NAN");

    // --- a small explicit budget loads far fewer messages (override honoured) ---
    const primedSmall = await runTurn("PROBE_SMALL", "250");
    const concatSmall = primedSmall.map((m) => m.content).join("\n");
    expect(primedSmall.at(-1)?.content).toBe("PROBE_SMALL");
    expect(concatSmall).toContain("MSG199");
    expect(concatSmall).not.toContain("MSG150");
    // strictly smaller window than the default budget.
    expect(primedSmall.length).toBeLessThan(primedDefault.length);
  });
});
