import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

/**
 * AC-631: The system prompt sent to the builder AI on each chat turn includes
 * the reproduce-a-website how-to guidance. The standalone how-to document exists
 * and references reading the digest, applying theme tokens, adding pages, the
 * /assets/{key} asset-reference rule, the digest_not_found fallback, and naming
 * low-confidence sections.
 */
describe("UAT AC-631: builder AI system prompt includes the reproduce-a-website how-to", () => {
  it("test_UAT_AC631_builder_system_prompt_includes_reproduce_website_howto", async () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const howtoPath = resolve(here, "../docs/llm-context/reproducing-a-website.md");
    const doc = readFileSync(howtoPath, "utf-8");

    // The standalone how-to document exists and covers its required sections
    // (AC-631). Byte-for-byte parity between this .md and the inlined
    // REPRODUCING_A_WEBSITE_DOC constant is a separate mirror-sync invariant,
    // not part of this AC — see the REQ-30 drift test.
    expect(doc).toMatch(/read_transcription_digest/);
    expect(doc).toMatch(/set_theme_token|themeTokens|theme token/i);
    expect(doc).toMatch(/add_page/);
    expect(doc).toMatch(/\/assets\//);
    expect(doc).toMatch(/digest_not_found/);
    expect(doc).toMatch(/low.?confidence/i);

    // The system prompt actually sent to the model on a chat turn includes it.
    let capturedSystem = "";
    const upstreamFetch = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const reqBody = JSON.parse(String(init?.body)) as { system: string };
        capturedSystem = reqBody.system;
        return new Response(
          JSON.stringify({
            id: "msg_test",
            content: [{ type: "text", text: "ok" }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    );

    const request = new Request("https://app.test/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        history: [{ role: "user", content: "hi" }],
        siteDefinition: load1stContactSite(),
        frameworkCatalog: buildFrameworkCatalog(),
      }),
    });
    const response = await handleChatRequest(
      request,
      { CLAUDE_API_KEY: "test-key" },
      { fetch: upstreamFetch as unknown as typeof fetch },
    );
    expect(response.status).toBe(200);
    expect(capturedSystem).toContain("read_transcription_digest");
    expect(capturedSystem).toMatch(/\/assets\//);
  });
});
