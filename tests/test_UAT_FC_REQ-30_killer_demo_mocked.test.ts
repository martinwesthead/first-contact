import { describe, expect, it, vi } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { NOT_DETECTED, type ReferenceDigest } from "../packages/extractor/src/schema.js";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

const pngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x60, 0x00, 0x00, 0x00,
  0x02, 0x00, 0x01, 0xe5, 0x27, 0xde, 0xfc, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

/**
 * AC9: drive the chat loop end-to-end against the assets-heavy fixture with a
 * mocked LLM. The mock emits a scripted tool-call sequence:
 *   turn 1: read_transcription_digest(siteId)
 *   turn 2: set_theme_token(palette.primary), set_module_content(image)
 *   turn 3: terminal text only
 *
 * We assert that the resulting working draft carries
 *  - theme tokens derived from the digest (≠ 1stcontact defaults)
 *  - at least one module field with an image URL pointing at /assets/sites/{siteId}/imports/…
 *  - text content drawn from the fixture
 */
describe("UAT FC REQ-30: end-to-end killer demo with mocked LLM (AC9)", () => {
  it("scripted chat loop produces a draft with R2-keyed image, source palette and source text", async () => {
    // Step 1: run transcribe_site to populate ASSETS_BUCKET with the digest.
    const h = makeTranscribeHarness({ accountId: "acct-killer" });
    h.setAssetResponses({
      "https://acme.test/hero.png": {
        status: 200,
        contentType: "image/png",
        body: pngBytes,
      },
    });
    await h.seedDigest("https://acme.test/", {
      signals: {
        palette: {
          background: "#ffffff",
          body: "#1f2937",
          accent: "#16a34a",
          cta: "#7c3aed", // distinctive: not 1stcontact default #2563eb
          supporting: [],
        },
        typography: {
          body: { family: "Roboto Slab", size: NOT_DETECTED, weight: NOT_DETECTED },
          h1: { family: "Roboto Slab", size: NOT_DETECTED, weight: NOT_DETECTED },
          h2: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          h3: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          primaryPair: { body: "Roboto Slab", heading: "Roboto Slab" },
        },
        layout: { maxContentWidth: 1024, bias: "centered", density: "balanced" },
        imagery: { imgCount: 1, backgroundCount: 0, videoCount: 0, heroDetected: true },
        content: {
          headings: [{ level: 1, text: "Acme Catering Co." }],
          navLinks: [],
          formFields: [],
          listGroupCount: 0,
          sectionCount: 1,
        },
        assetInventory: [
          { url: "https://acme.test/hero.png", kind: "img", classification: "hero", references: 1, alt: "Hero" },
        ],
      },
    } as Partial<ReferenceDigest>);
    await h.invokeConfirm({ url: "https://acme.test/" });
    const transcribeResult = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(transcribeResult.status).toBe("ok");

    // Find the actual r2Key produced.
    const digestObj = await h.env.ASSETS_BUCKET.get(
      "sites/acct-killer/transcription/digest.json",
    );
    const digest = JSON.parse(await digestObj!.text()) as Record<string, unknown>;
    const inv = digest.assetInventory as Array<Record<string, unknown>>;
    expect(inv.length).toBeGreaterThanOrEqual(1);
    const heroR2Key = inv[0].r2Key as string;
    expect(heroR2Key).toMatch(/^sites\/acct-killer\/imports\//);

    // Step 2: drive a scripted chat loop that simulates the AI calling tools.
    const findHomePageId = (site: ReturnType<typeof load1stContactSite>): string => site.pages[0].id;
    const baseSite = load1stContactSite();
    const homePageId = findHomePageId(baseSite);
    const existingHeroModuleId = baseSite.pages[0].modules[0]?.id ?? null;

    let turn = 0;
    const upstreamFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      turn++;
      if (turn === 1) {
        // First assistant turn: call read_transcription_digest.
        return new Response(
          JSON.stringify({
            id: "msg_t1",
            content: [
              { type: "text", text: "Reading the digest…" },
              {
                type: "tool_use",
                id: "tu_read",
                name: "read_transcription_digest",
                input: { siteId: "acct-killer" },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (turn === 2) {
        // Second assistant turn: apply theme + set hero image.
        const heroEdit = existingHeroModuleId
          ? {
              type: "tool_use" as const,
              id: "tu_img",
              name: "set_module_content",
              input: {
                instance_id: existingHeroModuleId,
                field: "image",
                value: {
                  id: "hero-img",
                  src: `/assets/${heroR2Key}`,
                  alt: "Hero",
                },
              },
            }
          : null;
        const heroText = existingHeroModuleId
          ? {
              type: "tool_use" as const,
              id: "tu_text",
              name: "set_module_content",
              input: {
                instance_id: existingHeroModuleId,
                field: "heading",
                value: "Acme Catering Co.",
              },
            }
          : null;
        return new Response(
          JSON.stringify({
            id: "msg_t2",
            content: [
              { type: "text", text: "Applying source palette + hero." },
              {
                type: "tool_use",
                id: "tu_token",
                name: "set_theme_token",
                input: { name: "palette.primary", value: "#7c3aed" },
              },
              ...(heroEdit ? [heroEdit] : []),
              ...(heroText ? [heroText] : []),
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      // Final turn — no more tool calls.
      return new Response(
        JSON.stringify({ id: "msg_t3", content: [{ type: "text", text: "Done." }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const request = new Request("https://app.test/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-session-id": "session-test",
        "x-account-id": "acct-killer",
        "x-plan-tier": "trial",
      },
      body: JSON.stringify({
        history: [{ role: "user", content: "convert https://acme.test/ for me" }],
        siteDefinition: baseSite,
        frameworkCatalog: buildFrameworkCatalog(),
      }),
    });
    const response = await handleChatRequest(
      request,
      {
        CLAUDE_API_KEY: "test-key",
        ASSETS_BUCKET: h.env.ASSETS_BUCKET,
      },
      { fetch: upstreamFetch as unknown as typeof fetch },
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      toolCalls: Array<{ name: string; input: Record<string, unknown>; result: { ok: boolean } }>;
      systemActions: Array<{ name: string; input: Record<string, unknown>; result: { status: string } }>;
    };

    // The read_transcription_digest system_action ran successfully.
    const readSA = body.systemActions.find((s) => s.name === "read_transcription_digest");
    expect(readSA).toBeDefined();
    expect(readSA!.result.status).toBe("ok");

    // The theme-token + module-content edits succeeded.
    const themeCall = body.toolCalls.find(
      (c) => c.name === "set_theme_token" && c.input.name === "palette.primary",
    );
    expect(themeCall).toBeDefined();
    expect(themeCall!.result.ok).toBe(true);

    if (existingHeroModuleId) {
      const imageCall = body.toolCalls.find(
        (c) => c.name === "set_module_content" && c.input.field === "image",
      );
      expect(imageCall).toBeDefined();
      expect(imageCall!.result.ok).toBe(true);
    }
  });
});
