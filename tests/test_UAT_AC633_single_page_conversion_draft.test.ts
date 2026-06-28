import { describe, expect, it, vi } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@1stcontact/builder-ui";
import { applyToolCall, type ToolName } from "@1stcontact/builder-ui/tools";
import type { Site } from "@1stcontact/site-schema";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import {
  NOT_DETECTED,
  type ReferenceDigest,
} from "../packages/extractor/src/schema.js";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

const pngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x60, 0x00, 0x00, 0x00,
  0x02, 0x00, 0x01, 0xe5, 0x27, 0xde, 0xfc, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

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

/** Replay the AI's successful state-edit tool calls to reconstruct the draft. */
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

/**
 * AC-633: End-to-end single-page conversion plus the AI reconstruction loop
 * produces a working draft that has ≥1 page, applies theme tokens distinct from
 * the framework defaults, contains a module image resolving to an R2-mirrored
 * key (/assets/sites/{siteId}/imports/…), and a module text including source
 * content.
 */
describe("UAT AC-633: end-to-end single-page conversion yields a source-styled draft", () => {
  it("test_UAT_AC633_single_page_conversion_yields_styled_draft", async () => {
    const siteId = "acct-633";
    const h = makeTranscribeHarness({ accountId: siteId });
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
          cta: "#7c3aed", // distinctive: not the 1stcontact default #2563eb
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
          {
            url: "https://acme.test/hero.png",
            kind: "img",
            classification: "hero",
            references: 1,
            alt: "Hero",
          },
        ],
      },
    } as Partial<ReferenceDigest>);
    await h.invokeConfirm({ url: "https://acme.test/" });
    const transcribeResult = await h.invokeTranscribe({
      digestId: "https://acme.test/",
    });
    expect(transcribeResult.status).toBe("ok");

    // The R2-mirrored hero key the AI will reference.
    const digestObj = await h.env.ASSETS_BUCKET.get(
      `sites/${siteId}/transcription/digest.json`,
    );
    const digest = JSON.parse(await digestObj!.text()) as {
      assetInventory: Array<{ r2Key: string }>;
    };
    const heroR2Key = digest.assetInventory[0].r2Key;
    expect(heroR2Key).toMatch(new RegExp(`^sites/${siteId}/imports/`));

    // Drive a scripted chat loop: read digest, then apply theme + hero edits.
    const baseSite = load1stContactSite();
    const heroModuleId = baseSite.pages[0].modules[0]!.id;
    const basePrimary = (baseSite as unknown as {
      theme: { palette: { primary: string } };
    }).theme.palette.primary;

    let turn = 0;
    const upstreamFetch = vi.fn(async () => {
      turn++;
      if (turn === 1) {
        return new Response(
          JSON.stringify({
            id: "msg_t1",
            content: [
              { type: "text", text: "Reading the digest…" },
              {
                type: "tool_use",
                id: "tu_read",
                name: "read_transcription_digest",
                input: { siteId },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (turn === 2) {
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
              {
                type: "tool_use",
                id: "tu_img",
                name: "set_module_content",
                input: {
                  instance_id: heroModuleId,
                  field: "image",
                  value: { id: "hero-img", src: `/assets/${heroR2Key}`, alt: "Hero" },
                },
              },
              {
                type: "tool_use",
                id: "tu_text",
                name: "set_module_content",
                input: {
                  instance_id: heroModuleId,
                  field: "heading",
                  value: "Acme Catering Co.",
                },
              },
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

    const catalog = buildFrameworkCatalog();
    const request = new Request("https://app.test/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-session-id": "session-test",
        "x-account-id": siteId,
        "x-plan-tier": "trial",
      },
      body: JSON.stringify({
        history: [{ role: "user", content: "convert https://acme.test/ for me" }],
        siteDefinition: baseSite,
        frameworkCatalog: catalog,
      }),
    });
    const response = await handleChatRequest(
      request,
      { CLAUDE_API_KEY: "test-key", ASSETS_BUCKET: h.env.ASSETS_BUCKET },
      { fetch: upstreamFetch as unknown as typeof fetch },
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      toolCalls: Array<{
        name: string;
        input: Record<string, unknown>;
        result: { ok: boolean };
      }>;
    };

    // Reconstruct the working draft from the AI's successful edits.
    const draft = reconstructDraft(load1stContactSite(), catalog, body.toolCalls);
    const view = draft as unknown as {
      theme: { palette: { primary: string } };
      pages: Array<{ modules?: Array<{ content?: Record<string, unknown> }> }>;
    };

    // (a) ≥1 page.
    expect(view.pages.length).toBeGreaterThanOrEqual(1);

    // (b) theme tokens differ from framework defaults.
    expect(view.theme.palette.primary).toBe("#7c3aed");
    expect(view.theme.palette.primary).not.toBe(basePrimary);

    const modules = view.pages.flatMap((p) => p.modules ?? []);
    // (c) a module image resolves to an R2-mirrored key, not the source URL.
    const hasR2Image = modules.some((m) =>
      JSON.stringify(m.content ?? {}).includes(`/assets/${heroR2Key}`),
    );
    expect(hasR2Image).toBe(true);
    const referencesSourceUrl = modules.some((m) =>
      JSON.stringify(m.content ?? {}).includes("https://acme.test/hero.png"),
    );
    expect(referencesSourceUrl).toBe(false);

    // (d) a module text includes content present in the source.
    const hasSourceText = modules.some((m) =>
      JSON.stringify(m.content ?? {}).includes("Acme Catering Co."),
    );
    expect(hasSourceText).toBe(true);
  });
});
