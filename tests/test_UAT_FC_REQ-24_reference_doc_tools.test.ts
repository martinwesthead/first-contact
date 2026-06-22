import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { makeAnthropicSequenceFetch } from "./_helpers_REQ-13_anthropic.js";
import { consumeChatSSE } from "./_helpers_REQ-36_chat_sse.js";
import { insertReferenceDoc } from "./_helpers_REQ-23_db.js";
import { seedChatSession, type SeededChatEnv } from "./_helpers_REQ-24_chat.js";

describe("UAT FC REQ-24: reference-doc tools — list_reference_docs and read_reference_doc(slug, section?)", () => {
  let env: SeededChatEnv;

  beforeAll(async () => {
    env = await seedChatSession({ sessionId: "sess_refdoc" });
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

  it("AC9: list_reference_docs returns the seeded set; read_reference_doc(slug) returns full body; with section=, only the requested section is returned", async () => {
    const { fetch: stubFetch, calls } = makeAnthropicSequenceFetch([
      {
        id: "msg_1",
        content: [
          {
            type: "tool_use",
            id: "toolu_list",
            name: "list_reference_docs",
            input: {},
          },
        ],
      },
      {
        id: "msg_2",
        content: [
          {
            type: "tool_use",
            id: "toolu_read_full",
            name: "read_reference_doc",
            input: { slug: "module-hero" },
          },
        ],
      },
      {
        id: "msg_3",
        content: [
          {
            type: "tool_use",
            id: "toolu_read_section",
            name: "read_reference_doc",
            input: { slug: "module-hero", section: "dials" },
          },
        ],
      },
      { id: "msg_4", content: [{ type: "text", text: "done." }] },
    ]);

    const response = await handleChatRequest(
      new Request("https://app/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: env.sessionId,
          userMessage: "what reference docs are there?",
          siteDefinition: load1stContactSite(),
          frameworkCatalog: buildFrameworkCatalog(),
        }),
      }),
      { CLAUDE_API_KEY: "test", SITES_DB: env.db },
      { fetch: stubFetch },
    );
    expect(response.status).toBe(200);
    await consumeChatSSE(response);

    type Frame = {
      content: Array<{ type: string; tool_use_id?: string; content?: string }>;
    };
    const listResult = JSON.parse(
      (calls[1]!.body.messages.at(-1) as Frame).content.find(
        (b) => b.tool_use_id === "toolu_list",
      )!.content!,
    ) as { ok: boolean; data: { docs: Array<{ slug: string; title: string }> } };
    expect(listResult.ok).toBe(true);
    expect(listResult.data.docs.map((d) => d.slug)).toContain("module-hero");

    const fullResult = JSON.parse(
      (calls[2]!.body.messages.at(-1) as Frame).content.find(
        (b) => b.tool_use_id === "toolu_read_full",
      )!.content!,
    ) as { ok: boolean; data: { body: string; section?: string } };
    expect(fullResult.ok).toBe(true);
    expect(fullResult.data.body).toContain("UNIQUE-OVERVIEW-MARKER");
    expect(fullResult.data.body).toContain("UNIQUE-DIALS-MARKER");
    expect(fullResult.data.section).toBeUndefined();

    const sectionResult = JSON.parse(
      (calls[3]!.body.messages.at(-1) as Frame).content.find(
        (b) => b.tool_use_id === "toolu_read_section",
      )!.content!,
    ) as { ok: boolean; data: { body: string; section?: string } };
    expect(sectionResult.ok).toBe(true);
    expect(sectionResult.data.section).toBe("dials");
    expect(sectionResult.data.body).toContain("UNIQUE-DIALS-MARKER");
    expect(sectionResult.data.body).not.toContain("UNIQUE-OVERVIEW-MARKER");
  });
});
