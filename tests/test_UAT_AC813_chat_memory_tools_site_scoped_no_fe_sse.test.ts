import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { makeAnthropicSequenceFetch } from "./_helpers_REQ-13_anthropic.js";
import { consumeChatSSE } from "./_helpers_REQ-36_chat_sse.js";
import {
  insertMessage,
  insertReferenceDoc,
  insertSession,
  insertSite,
} from "./_helpers_REQ-23_db.js";
import { seedChatSession, type SeededChatEnv } from "./_helpers_REQ-24_chat.js";

/**
 * AC-813: the Anthropic tool list carries four read-only, server-executed AI
 * memory tools alongside the plan-tier builder tools — search_transcripts,
 * read_session_range, list_reference_docs, read_reference_doc. They are
 * site-scoped (transcript search & range reads only see the request site's
 * sessions; a session_id from another site is reported as not-found), and a
 * read_reference_doc with a `section` narrows the body (unknown section falls
 * back to the full body). Memory-tool calls/results are fed back to the model
 * but are NOT emitted as client-facing tool_call/tool_result SSE events.
 */
const MEMORY_TOOLS = [
  "search_transcripts",
  "read_session_range",
  "list_reference_docs",
  "read_reference_doc",
];

describe("UAT AC-813: four server-executed AI memory tools, site-scoped, do not emit FE tool-pane SSE events", () => {
  let env: SeededChatEnv;
  const siteB = "site_ac813_other";
  const sessionB = "sess_ac813_other";
  const keyword = "GLUTENFREE-PIZZA-MENU";

  beforeAll(async () => {
    env = await seedChatSession({ siteId: "site_ac813_a", sessionId: "sess_ac813_a" });
    // Same keyword in site A's session AND a different site's session.
    await insertMessage(env.db, {
      id: "msg_ac813_a",
      session_id: env.sessionId,
      ord: 0,
      role: "user",
      content: `tell me about ${keyword} on site A`,
    });
    await insertSite(env.db, {
      id: siteB,
      account_id: "acct_1stcontact_platform",
      slug: "ac813-other",
    });
    await insertSession(env.db, { id: sessionB, site_id: siteB });
    await insertMessage(env.db, {
      id: "msg_ac813_b",
      session_id: sessionB,
      ord: 0,
      role: "user",
      content: `${keyword} also discussed on site B`,
    });
    await insertReferenceDoc(env.db, {
      slug: "module-hero",
      title: "Hero module",
      summary: "Top-of-page banner module with optional CTA.",
      kind: "module",
      toc_json: JSON.stringify([
        { section_slug: "overview", description: "What the hero is for" },
        { section_slug: "dials", description: "Tunable visual dials" },
      ]),
      body:
        "# Hero module\n\n" +
        "## Overview\n\nUNIQUE-OVERVIEW-MARKER body explaining purpose.\n\n" +
        "## Dials\n\nUNIQUE-DIALS-MARKER body listing dials.\n\n" +
        "## Notes\n\nfinal section.",
    });
  });

  afterAll(async () => {
    await env.cleanup();
  });

  it("test_UAT_AC813_memory_tools_listed_site_scoped_and_suppressed_from_fe_sse", async () => {
    const { fetch: stubFetch, calls } = makeAnthropicSequenceFetch([
      {
        id: "m1",
        content: [
          { type: "tool_use", id: "toolu_search", name: "search_transcripts", input: { query: keyword } },
        ],
      },
      {
        id: "m2",
        content: [
          {
            type: "tool_use",
            id: "toolu_range",
            name: "read_session_range",
            input: { session_id: sessionB, from_ord: 0, to_ord: 5 },
          },
        ],
      },
      {
        id: "m3",
        content: [
          { type: "tool_use", id: "toolu_full", name: "read_reference_doc", input: { slug: "module-hero" } },
        ],
      },
      {
        id: "m4",
        content: [
          {
            type: "tool_use",
            id: "toolu_dials",
            name: "read_reference_doc",
            input: { slug: "module-hero", section: "dials" },
          },
        ],
      },
      {
        id: "m5",
        content: [
          {
            type: "tool_use",
            id: "toolu_unknown",
            name: "read_reference_doc",
            input: { slug: "module-hero", section: "does-not-exist" },
          },
        ],
      },
      { id: "m6", content: [{ type: "text", text: "done." }] },
    ]);

    const response = await handleChatRequest(
      new Request("https://app/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: env.sessionId,
          userMessage: `recall ${keyword}`,
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

    // (1) The four memory tools appear in the upstream tool list alongside the
    //     builder tools (e.g. set_module_dial).
    const toolNames = (calls[0]!.body.tools as Array<{ name: string }>).map((t) => t.name);
    for (const name of MEMORY_TOOLS) {
      expect(toolNames).toContain(name);
    }
    expect(toolNames).toContain("set_module_dial");

    // Helper: pull the tool_result block fed back on the NEXT turn.
    type Frame = {
      role: string;
      content: Array<{ type: string; tool_use_id?: string; content?: string; is_error?: boolean }>;
    };
    const resultBlock = (callIndex: number, toolUseId: string) => {
      const last = calls[callIndex]!.body.messages.at(-1) as Frame;
      const block = last.content.find(
        (b) => b.type === "tool_result" && b.tool_use_id === toolUseId,
      );
      expect(block).toBeDefined();
      return block!;
    };

    // (2) search_transcripts is site-scoped: only site A's session hits.
    const searchBlock = resultBlock(1, "toolu_search");
    const search = JSON.parse(searchBlock.content!) as {
      ok: boolean;
      data: { hits: Array<{ session_id: string }> };
    };
    expect(search.ok).toBe(true);
    const hitSessions = search.data.hits.map((h) => h.session_id);
    expect(hitSessions).toContain(env.sessionId);
    expect(hitSessions).not.toContain(sessionB);

    // read_session_range against a different site's session → not-found error.
    const rangeBlock = resultBlock(2, "toolu_range");
    expect(rangeBlock.is_error).toBe(true);
    const range = JSON.parse(rangeBlock.content!) as { ok: boolean; error: string };
    expect(range.ok).toBe(false);
    expect(range.error).toMatch(/not found in this site/i);

    // read_reference_doc(slug) → full body (both section markers present).
    const fullBlock = resultBlock(3, "toolu_full");
    const full = JSON.parse(fullBlock.content!) as {
      ok: boolean;
      data: { body: string; section?: string };
    };
    expect(full.ok).toBe(true);
    expect(full.data.section).toBeUndefined();
    expect(full.data.body).toContain("UNIQUE-OVERVIEW-MARKER");
    expect(full.data.body).toContain("UNIQUE-DIALS-MARKER");

    // read_reference_doc(slug, section=dials) → only that section.
    const dialsBlock = resultBlock(4, "toolu_dials");
    const dials = JSON.parse(dialsBlock.content!) as {
      ok: boolean;
      data: { body: string; section?: string };
    };
    expect(dials.ok).toBe(true);
    expect(dials.data.section).toBe("dials");
    expect(dials.data.body).toContain("UNIQUE-DIALS-MARKER");
    expect(dials.data.body).not.toContain("UNIQUE-OVERVIEW-MARKER");

    // read_reference_doc with an unknown section → full body fallback.
    const unknownBlock = resultBlock(5, "toolu_unknown");
    const unknown = JSON.parse(unknownBlock.content!) as {
      ok: boolean;
      data: { body: string };
    };
    expect(unknown.ok).toBe(true);
    expect(unknown.data.body).toContain("UNIQUE-OVERVIEW-MARKER");
    expect(unknown.data.body).toContain("UNIQUE-DIALS-MARKER");

    // (3) NONE of the memory-tool invocations surface as client-facing SSE
    //     tool_call / tool_result events (no FE tool-use pane noise).
    const sseCallNames = consumed.toolCallEvents.map((e) => e.name);
    const sseResultNames = consumed.toolResultEvents.map((e) => e.name);
    for (const name of MEMORY_TOOLS) {
      expect(sseCallNames).not.toContain(name);
      expect(sseResultNames).not.toContain(name);
    }
    // This turn invoked only memory tools, so no builder tool events surfaced.
    expect(consumed.toolCallEvents.length).toBe(0);
    expect(consumed.toolResultEvents.length).toBe(0);
  });
});
