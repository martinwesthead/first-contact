import { describe, expect, it, vi } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { NOT_DETECTED, type ReferenceDigest } from "../packages/extractor/src/schema.js";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

function minimalDigest(title: string, navLinks: ReferenceDigest["signals"]["content"]["navLinks"], formFields: ReferenceDigest["signals"]["content"]["formFields"]): Partial<ReferenceDigest> {
  return {
    signals: {
      palette: { background: "#ffffff", body: "#222222", accent: NOT_DETECTED, cta: NOT_DETECTED, supporting: [] },
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

describe("UAT FC REQ-30: multi-page killer demo with mocked LLM (AC10)", () => {
  it("scripted chat loop adds pages from perPagePlan and the working draft ends up with ≥3 pages", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-multi" });
    const navLinks = [
      { text: "Menu", href: "https://acme.test/menu" },
      { text: "Contact", href: "https://acme.test/contact" },
    ];
    await h.seedDigest("https://acme.test/", minimalDigest("Acme", navLinks, []));
    await h.seedDigest("https://acme.test/menu", minimalDigest("Menu", [], []));
    await h.seedDigest("https://acme.test/contact", minimalDigest("Contact", [], [{ name: "email", kind: "email" }]));
    const transcribeResult = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(transcribeResult.status).toBe("ok");

    const digestObj = await h.env.ASSETS_BUCKET.get(
      "sites/acct-multi/transcription/digest.json",
    );
    const digest = JSON.parse(await digestObj!.text()) as Record<string, unknown>;
    const plan = digest.perPagePlan as Array<Record<string, unknown>>;
    expect(plan.length).toBeGreaterThanOrEqual(3);
    const nonHomeSlugs = plan.filter((p) => p.slug !== "/").map((p) => p.slug as string);

    // Drive the chat: AI calls add_page for each non-home perPagePlan entry.
    let turn = 0;
    const upstreamFetch = vi.fn(async () => {
      turn++;
      if (turn === 1) {
        return new Response(
          JSON.stringify({
            id: "msg_t1",
            content: [
              { type: "text", text: "Reading the digest." },
              {
                type: "tool_use",
                id: "tu_read",
                name: "read_transcription_digest",
                input: { siteId: "acct-multi" },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (turn === 2) {
        // For each non-home page in perPagePlan, emit an add_page tool call.
        const addCalls = nonHomeSlugs.map((slug, i) => ({
          type: "tool_use" as const,
          id: `tu_add_${i}`,
          name: "add_page",
          input: { slug: slug.replace(/^\//, ""), title: slug.replace(/^\//, "").replace(/^./, (c) => c.toUpperCase()) },
        }));
        return new Response(
          JSON.stringify({
            id: "msg_t2",
            content: [
              { type: "text", text: "Adding pages." },
              ...addCalls,
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ id: "msg_t3", content: [{ type: "text", text: "Done." }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const baseSite = load1stContactSite();
    const request = new Request("https://app.test/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-session-id": "session-test",
        "x-account-id": "acct-multi",
        "x-plan-tier": "trial",
      },
      body: JSON.stringify({
        history: [{ role: "user", content: "convert https://acme.test/ — keep all pages" }],
        siteDefinition: baseSite,
        frameworkCatalog: buildFrameworkCatalog(),
      }),
    });
    const response = await handleChatRequest(
      request,
      { CLAUDE_API_KEY: "test-key", ASSETS_BUCKET: h.env.ASSETS_BUCKET },
      { fetch: upstreamFetch as unknown as typeof fetch },
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      toolCalls: Array<{ name: string; input: Record<string, unknown>; result: { ok: boolean } }>;
    };

    const addCalls = body.toolCalls.filter((c) => c.name === "add_page" && c.result.ok);
    expect(addCalls.length).toBeGreaterThanOrEqual(2);
    // Distinct slugs.
    const addedSlugs = addCalls.map((c) => c.input.slug as string);
    expect(new Set(addedSlugs).size).toBe(addedSlugs.length);
  });
});
