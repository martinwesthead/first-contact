import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { makeAnthropicSequenceFetch } from "./_helpers_REQ-13_anthropic.js";
import { consumeChatSSE } from "./_helpers_REQ-36_chat_sse.js";
import { insertMessage } from "./_helpers_REQ-23_db.js";
import { seedChatSession, type SeededChatEnv } from "./_helpers_REQ-24_chat.js";

describe("UAT FC REQ-24: tail-prime loads ≥CHAT_TAIL_CHARS of the most-recent contiguous tail and omits the head", () => {
  let env: SeededChatEnv;

  beforeAll(async () => {
    env = await seedChatSession({ sessionId: "sess_tail" });
    // 200 short messages, each ~80 chars including a unique tag so we can
    // tell what was loaded.
    for (let i = 0; i < 200; i++) {
      const role = i % 2 === 0 ? "user" : "assistant";
      const body = `MSG${i.toString().padStart(3, "0")} — ` + "x".repeat(72);
      await insertMessage(env.db, {
        id: `msg_tail_${i}`,
        session_id: env.sessionId,
        ord: i,
        role,
        content: body,
        ts: 1_700_000_000_000 + i * 1000,
      });
    }
  });

  afterAll(async () => {
    await env.cleanup();
  });

  it("AC6: the tail sent to Anthropic is at least CHAT_TAIL_CHARS (=5000) chars and contains the newest messages contiguously, NOT the head", async () => {
    const { fetch: stubFetch, calls } = makeAnthropicSequenceFetch([
      { id: "msg_1", content: [{ type: "text", text: "done." }] },
    ]);
    const response = await handleChatRequest(
      new Request("https://app/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: env.sessionId,
          userMessage: "PROBE",
          siteDefinition: load1stContactSite(),
          frameworkCatalog: buildFrameworkCatalog(),
        }),
      }),
      { CLAUDE_API_KEY: "test", SITES_DB: env.db },
      { fetch: stubFetch },
    );
    expect(response.status).toBe(200);
    const consumed = await consumeChatSSE(response);
    expect(consumed.error).toBeNull();

    const primed = calls[0]!.body.messages as Array<{
      role: string;
      content: string;
    }>;
    // The newly-appended user message PROBE must be last in the primed tail.
    expect(primed.at(-1)?.role).toBe("user");
    expect(primed.at(-1)?.content).toBe("PROBE");

    // Tail must include the high-numbered messages and omit the low-numbered
    // head. With 200 messages of ~80 chars each and a 5000-char budget, we
    // load roughly the last ~63 messages plus the PROBE.
    const concatenated = primed.map((m) => m.content).join("\n");
    expect(concatenated.length).toBeGreaterThanOrEqual(5000);
    expect(concatenated).toContain("MSG199");
    expect(concatenated).toContain("MSG150");
    expect(concatenated).not.toContain("MSG000");
    expect(concatenated).not.toContain("MSG050");

    // Tail must be CONTIGUOUS — every numbered message between the lowest
    // included one and MSG199 must be present (no gaps).
    const tags = Array.from(concatenated.matchAll(/MSG(\d{3})/g)).map((m) =>
      Number(m[1]),
    );
    const uniqueSorted = [...new Set(tags)].sort((a, b) => a - b);
    for (let i = 1; i < uniqueSorted.length; i++) {
      expect(uniqueSorted[i]! - uniqueSorted[i - 1]!).toBe(1);
    }
  });
});
