// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildFrameworkCatalog,
  clearToolResultRenderers,
  registerDigestReport,
  renderMarkdownToDom,
  renderToolResult,
  type ChatToolResultRecord,
} from "@gendev/builder-ui";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { makeMemKv } from "./_helpers_REQ-20_kv.js";
import {
  consumeChatSSE,
  encodeAnthropicSSE,
} from "./_helpers_REQ-36_chat_sse.js";
import { makeStubChatDb } from "./_helpers_REQ-24_chat.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLAIN_HTML = readFileSync(
  join(
    __dirname,
    "fixtures",
    "convert-flow",
    "plain-html-site",
    "index.html",
  ),
  "utf8",
);

describe("UAT FC REQ-21: end-to-end chat → analyze_page → <DigestReport> render (AC 13)", () => {
  beforeEach(() => {
    clearToolResultRenderers();
    registerDigestReport();
  });
  afterEach(() => {
    clearToolResultRenderers();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("AC13: operator pastes URL → AI calls analyze_page → chat response carries a kind='reference_digest' tool_result whose data renders into a card with palette, asset counts, and the AI summary visible", async () => {
    const site = load1stContactSite();
    const targetUrl = "https://x.test/";

    const anthropicResponses = [
      // Turn 1 — AI calls analyze_page.
      {
        id: "msg_1",
        content: [
          {
            type: "tool_use",
            id: "toolu_analyze_1",
            name: "analyze_page",
            input: { url: targetUrl },
          },
        ],
      },
      // Turn 2 — AI sees the tool_result and replies with confirmation.
      {
        id: "msg_2",
        content: [
          {
            type: "text",
            text: "Reference digest is ready — review it in the card above.",
          },
        ],
      },
    ];
    let anthropicTurn = 0;
    const commentary = {
      summary: "Acme: a clean static landing page with hero, features, and a contact form.",
      perSection: {
        palette: "Bright, high-contrast: green accents on white.",
        typography: "Inter body, Source Serif Pro display.",
      },
      whatsMissing: [],
    };

    globalThis.fetch = vi.fn(async (input: unknown, _init?: unknown) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url;
      if (url === "https://anthropic.test/v1/messages") {
        // The first time analyze_page runs its own Haiku commentary call.
        // The chat handler also calls Anthropic. We distinguish by the
        // request body's `tools` field — chat handler sends `tools`, the
        // analyze_page commentary call does not.
        const initBody =
          typeof (_init as { body?: string } | undefined)?.body === "string"
            ? JSON.parse((_init as { body: string }).body)
            : {};
        const isChatTurn = Array.isArray(initBody.tools);
        if (isChatTurn) {
          const r = anthropicResponses[Math.min(anthropicTurn, anthropicResponses.length - 1)];
          anthropicTurn++;
          return new Response(encodeAnthropicSSE(r), {
            status: 200,
            headers: { "content-type": "text/event-stream" },
          });
        }
        // Commentary call from analyze_page.
        return new Response(
          JSON.stringify({
            content: [{ type: "text", text: JSON.stringify(commentary) }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.endsWith("/robots.txt")) {
        return new Response("", { status: 200 });
      }
      if (url === targetUrl) {
        return new Response(PLAIN_HTML, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      return new Response("not stubbed: " + url, { status: 404 });
    }) as unknown as typeof fetch;

    const request = new Request("https://app.1stcontact.io/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", "x-session-id": "session-e2e" },
      body: JSON.stringify({
        sessionId: "sess_req21",
        userMessage: `please analyze ${targetUrl} as a reference for the new site`,
        siteDefinition: site,
        frameworkCatalog: buildFrameworkCatalog(),
      }),
    });

    const stubDb = makeStubChatDb({ sessionId: "sess_req21" });
    const env = {
      CLAUDE_API_KEY: "test-key",
      ANTHROPIC_API_URL: "https://anthropic.test/v1/messages",
      FETCH_CACHE_KV: makeMemKv(),
      FETCH_ROBOTS_KV: makeMemKv(),
      FETCH_RATE_KV: makeMemKv(),
      SITES_DB: stubDb.binding as unknown as D1Database,
    };

    const response = await handleChatRequest(request, env);
    expect(response.status).toBe(200);
    const consumed = await consumeChatSSE(response);
    expect(consumed.done).not.toBeNull();
    const body = consumed.done! as {
      text: string;
      toolCalls: Array<{
        name: string;
        result: ChatToolResultRecord;
      }>;
    };

    const call = body.toolCalls.find((c) => c.name === "analyze_page");
    expect(call).toBeDefined();
    expect(call!.result.ok).toBe(true);
    if (!call!.result.ok) return;
    expect(call!.result.applied.kind).toBe("reference_digest");
    const data = call!.result.applied.data as {
      digest: { sourceUrl: string };
      digestMarkdown: string;
    };
    expect(data.digest.sourceUrl).toBe(targetUrl);
    expect(data.digestMarkdown).toMatch(/^# Reference Digest/);

    // Now render it via the DigestReport dispatcher.
    const node = renderToolResult({
      doc: document,
      result: call!.result,
      renderMarkdown: (md) => renderMarkdownToDom(document, md),
    }) as HTMLElement;
    document.body.appendChild(node);

    expect(node.getAttribute("data-fc-chat-card-tone")).toBe("info");
    const reportRoot = node.querySelector("[data-fc-digest-report]") as HTMLElement;
    expect(reportRoot).not.toBeNull();
    // palette swatch — hex of the body color from the fixture
    expect(reportRoot.textContent).toContain("#2563eb");
    // asset counts (3 imgs from the fixture: logo, hero, feature)
    const counts = reportRoot.querySelector(
      "[data-fc-digest-counts]",
    ) as HTMLElement;
    expect(counts.getAttribute("data-fc-digest-count-img")).toBe("3");
    expect(Number(counts.getAttribute("data-fc-digest-count-background") ?? "0"))
      .toBeGreaterThanOrEqual(2);
    expect(counts.getAttribute("data-fc-digest-count-video")).toBe("2");
    // AI summary text
    expect(reportRoot.textContent).toContain("hero");

    expect(body.text).toContain("Reference digest is ready");
  });
});
