import { describe, expect, it } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@gendev/builder-ui";
import { applyToolCall, type ToolName } from "@gendev/builder-ui/tools";
import type { Site } from "@gendev/site-schema";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import {
  NOT_DETECTED,
  type ReferenceDigest,
} from "../packages/extractor/src/schema.js";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";
import {
  consumeChatSSE,
  makeAnthropicStreamingFetch,
} from "./_helpers_REQ-36_chat_sse.js";
import { seedChatSession } from "./_helpers_REQ-24_chat.js";

const STATE_EDIT_TOOLS = new Set<string>([
  "set_module_content",
  "set_module_dial",
  "set_module_variant",
  "add_module",
  "remove_module",
  "reorder_modules",
  "set_theme_token",
  "set_site_config",
  "add_page",
  "remove_page",
  "reorder_pages",
]);

function reconstructDraft(
  base: Site,
  catalog: ReturnType<typeof buildFrameworkCatalog>,
  toolCalls: Array<{
    name: string;
    input: Record<string, unknown>;
    result: { ok: boolean };
  }>,
): Site {
  let site = base;
  for (const call of toolCalls) {
    if (!STATE_EDIT_TOOLS.has(call.name) || !call.result.ok) continue;
    const applied = applyToolCall(site, catalog, {
      name: call.name as ToolName,
      input: call.input,
    });
    if (applied.ok) site = applied.next;
  }
  return site;
}

function minimalDigest(
  title: string,
  navLinks: ReferenceDigest["signals"]["content"]["navLinks"],
  formFields: ReferenceDigest["signals"]["content"]["formFields"],
): Partial<ReferenceDigest> {
  return {
    signals: {
      palette: {
        background: "#ffffff",
        body: "#222222",
        accent: NOT_DETECTED,
        cta: NOT_DETECTED,
        supporting: [],
      },
      typography: {
        body: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
        h1: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
        h2: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
        h3: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
        primaryPair: NOT_DETECTED,
      },
      layout: { maxContentWidth: NOT_DETECTED, bias: NOT_DETECTED, density: NOT_DETECTED },
      imagery: { imgCount: 0, backgroundCount: 0, videoCount: 0, heroDetected: false },
      content: {
        headings: [{ level: 1, text: title }],
        navLinks,
        formFields,
        listGroupCount: 0,
        sectionCount: 1,
      },
      assetInventory: [],
    },
  };
}

/**
 * AC-634: For a source whose home page links to additional already-analyzed
 * same-origin pages, the persisted per-page plan has multiple distinct-slug
 * entries, and the AI reconstruction loop produces a working draft with at least
 * the number of discovered pages, all with distinct slugs. The page count is not
 * capped.
 */
describe("UAT AC-634: end-to-end multi-page conversion yields a multi-page draft with no page cap", () => {
  it("test_UAT_AC634_multi_page_conversion_yields_multi_page_draft", async () => {
    const siteId = "acct-634";
    const h = makeTranscribeHarness({ accountId: siteId });
    const navLinks = [
      { text: "Menu", href: "https://acme.test/menu" },
      { text: "Contact", href: "https://acme.test/contact" },
    ];
    await h.seedDigest("https://acme.test/", minimalDigest("Acme", navLinks, []));
    await h.seedDigest("https://acme.test/menu", minimalDigest("Menu", [], []));
    await h.seedDigest(
      "https://acme.test/contact",
      minimalDigest("Contact", [], [{ name: "email", kind: "email" }]),
    );
    const transcribeResult = await h.invokeTranscribe({
      digestId: "https://acme.test/",
    });
    expect(transcribeResult.status).toBe("ok");

    // Per-page plan has multiple distinct-slug entries.
    const digestObj = await h.env.ASSETS_BUCKET.get(
      `sites/${siteId}/transcription/digest.json`,
    );
    const digest = JSON.parse(await digestObj!.text()) as {
      perPagePlan: Array<{ slug: string }>;
    };
    const plan = digest.perPagePlan;
    const discoveredPageCount = plan.length;
    expect(discoveredPageCount).toBeGreaterThanOrEqual(3);
    const planSlugs = plan.map((p) => p.slug);
    expect(new Set(planSlugs).size).toBe(planSlugs.length);
    const nonHomeSlugs = plan.filter((p) => p.slug !== "/").map((p) => p.slug);

    // Drive the chat: AI calls add_page for each non-home plan entry. The chat
    // handler consumes Anthropic's streaming SSE protocol, so serve the scripted
    // turns as SSE (read digest → add the discovered pages → terminating text).
    const addCalls = nonHomeSlugs.map((slug, i) => ({
      type: "tool_use" as const,
      id: `tu_add_${i}`,
      name: "add_page",
      input: {
        slug: slug.replace(/^\//, ""),
        title: slug.replace(/^\//, "").replace(/^./, (c) => c.toUpperCase()),
      },
    }));
    const { fetch: upstreamFetch } = makeAnthropicStreamingFetch([
      {
        id: "msg_t1",
        content: [
          { type: "text", text: "Reading the digest." },
          {
            type: "tool_use",
            id: "tu_read",
            name: "read_transcription_digest",
            input: { siteId },
          },
        ],
      },
      {
        id: "msg_t2",
        content: [{ type: "text", text: "Adding pages." }, ...addCalls],
      },
      { id: "msg_t3", content: [{ type: "text", text: "Done." }] },
    ]);

    const catalog = buildFrameworkCatalog();
    const baseSite = load1stContactSite();
    const chatSession = await seedChatSession({ sessionId: "sess_ac634" });
    const request = new Request("https://app.test/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-session-id": "session-test",
        "x-account-id": siteId,
        "x-plan-tier": "trial",
      },
      body: JSON.stringify({
        sessionId: chatSession.sessionId,
        userMessage: "convert https://acme.test/ — keep all pages",
        siteDefinition: baseSite,
        frameworkCatalog: catalog,
      }),
    });
    const response = await handleChatRequest(
      request,
      {
        CLAUDE_API_KEY: "test-key",
        ASSETS_BUCKET: h.env.ASSETS_BUCKET,
        SITES_DB: chatSession.db,
      },
      { fetch: upstreamFetch },
    );
    expect(response.status).toBe(200);
    const consumed = await consumeChatSSE(response);
    await chatSession.cleanup();
    const body = consumed.done!;

    // Reconstruct the working draft from the AI's successful add_page edits.
    const draft = reconstructDraft(load1stContactSite(), catalog, body.toolCalls);
    const view = draft as unknown as { pages: Array<{ slug: string }> };

    // The draft has at least the number of discovered pages, all distinct.
    expect(view.pages.length).toBeGreaterThanOrEqual(discoveredPageCount);
    const slugs = view.pages.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
