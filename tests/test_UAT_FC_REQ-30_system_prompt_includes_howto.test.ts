import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { REPRODUCING_A_WEBSITE_DOC } from "../apps/control-app/src/llm-context.js";
import { buildFrameworkCatalog } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

const here = dirname(fileURLToPath(import.meta.url));
const howtoPath = resolve(
  here,
  "../docs/llm-context/reproducing-a-website.md",
);

describe("UAT FC REQ-30: chat system prompt includes the how-to doc (AC6)", () => {
  it("the inlined constant matches the canonical .md file byte-for-byte (drift guard)", () => {
    const fromDisk = readFileSync(howtoPath, "utf-8");
    expect(REPRODUCING_A_WEBSITE_DOC).toBe(fromDisk);
  });

  it("the doc file exists at docs/llm-context/reproducing-a-website.md and covers all six sections", () => {
    const src = readFileSync(howtoPath, "utf-8");
    // Each numbered section must be present. Use lenient matching — just look
    // for distinctive language so cosmetic edits don't break the test.
    expect(src).toMatch(/convert this site|paste this URL/i);
    expect(src).toMatch(/read_transcription_digest/);
    expect(src).toMatch(/set_theme_token|themeTokens/);
    expect(src).toMatch(/add_page/);
    expect(src).toMatch(/\/assets\//);
    expect(src).toMatch(/digest_not_found/);
    expect(src).toMatch(/low.?confidence/i);
  });

  it("buildSystemPrompt includes a distinctive sentence from the how-to doc", async () => {
    const howtoText = readFileSync(howtoPath, "utf-8");
    // Pick a sentence/phrase that's distinctive enough to assert against.
    expect(howtoText).toMatch(/read_transcription_digest/);

    let capturedSystem = "";
    const upstreamFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const reqBody = JSON.parse(String(init?.body));
      capturedSystem = reqBody.system as string;
      return new Response(
        JSON.stringify({ id: "msg_test", content: [{ type: "text", text: "ok" }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

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
    // And specifically: the doc's distinctive guidance about /assets/{r2Key}.
    expect(capturedSystem).toMatch(/\/assets\//);
  });
});
