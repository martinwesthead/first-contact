import { describe, expect, it, vi } from "vitest";
import {
  ReferenceDigest,
  SCHEMA_VERSION,
} from "../packages/extractor/src/index.js";
import {
  checkRateLimit,
  DEFAULT_RATE_LIMITS,
  mintIntentToken,
} from "../packages/web-fetch-safety/src/index.js";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { loadFixture, makeHarness } from "./_helpers_REQ-21_analyze_page.js";
import { makeMemKv } from "./_helpers_REQ-20_kv.js";
import { makeStubChatDb } from "./_helpers_REQ-24_chat.js";
import {
  consumeChatSSE,
  encodeAnthropicSSE,
  type StubContentBlock,
} from "./_helpers_REQ-36_chat_sse.js";

const TARGET_URL = "https://x.test/";

// --- AC-598 -----------------------------------------------------------------

describe("UAT AC-598: analyzing a valid URL returns a reference_digest with full digest, markdown, and a cache-miss marker", () => {
  it("test_UAT_AC598_valid_url_returns_reference_digest_miss", async () => {
    const h = makeHarness({ claudeApiKey: "model-key" });
    h.setHtmlBody(loadFixture("plain-html-site"));
    h.setAnthropicCommentary({
      summary: "A clean static landing page.",
      perSection: { palette: "Calm." },
      whatsMissing: [],
    });

    const result = await h.invoke({ url: TARGET_URL });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const payload = result.payload as {
      kind: string;
      digest: unknown;
      digestMarkdown: string;
      cache: string;
    };
    expect(payload.kind).toBe("reference_digest");
    expect(payload.cache).toBe("MISS");
    expect(typeof payload.digestMarkdown).toBe("string");
    expect(payload.digestMarkdown.length).toBeGreaterThan(0);

    // The full Reference Digest validates against the schema (schemaVersion 1)
    // with all five signal categories present.
    const parsed = ReferenceDigest.safeParse(payload.digest);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.data.signals.palette).toBeDefined();
    expect(parsed.data.signals.typography).toBeDefined();
    expect(parsed.data.signals.layout).toBeDefined();
    expect(parsed.data.signals.imagery).toBeDefined();
    expect(parsed.data.signals.content).toBeDefined();
  });
});

// --- AC-599 -----------------------------------------------------------------

describe("UAT AC-599: analysis is refused without operator intent and proceeds with a pasted URL or a valid intent token", () => {
  it("test_UAT_AC599_intent_required_then_proceeds_with_url_or_token", async () => {
    // (1) No operator message and no token → typed failure naming the missing intent.
    const noIntent = makeHarness({ operatorLastMessage: null });
    noIntent.setHtmlBody(loadFixture("plain-html-site"));
    const r1 = await noIntent.invoke({ url: TARGET_URL });
    expect(r1.status).toBe("failed");
    if (r1.status === "failed") expect(r1.error).toMatch(/operator intent/i);

    // (2) Operator's latest message contains the target URL → success.
    const pasted = makeHarness({
      operatorLastMessage: `please analyze ${TARGET_URL} for me`,
    });
    pasted.setHtmlBody(loadFixture("plain-html-site"));
    const r2 = await pasted.invoke({ url: TARGET_URL });
    expect(r2.status).toBe("ok");

    // (3) A fresh, session-bound intent token with a null operator message → success.
    const tokenOk = makeHarness({ operatorLastMessage: null });
    tokenOk.setHtmlBody(loadFixture("plain-html-site"));
    const minted = await mintIntentToken(
      { FETCH_RATE_KV: tokenOk.env.FETCH_RATE_KV },
      { sessionId: "session-test", accountId: "acct-test" },
    );
    const r3 = await tokenOk.invoke({ url: TARGET_URL, intentToken: minted.token });
    expect(r3.status).toBe("ok");

    // (4) A token bound to a different session → failure.
    const tokenBad = makeHarness({ operatorLastMessage: null });
    tokenBad.setHtmlBody(loadFixture("plain-html-site"));
    const mintedOther = await mintIntentToken(
      { FETCH_RATE_KV: tokenBad.env.FETCH_RATE_KV },
      { sessionId: "some-other-session", accountId: "acct-test" },
    );
    const r4 = await tokenBad.invoke({
      url: TARGET_URL,
      intentToken: mintedOther.token,
    });
    expect(r4.status).toBe("failed");
    if (r4.status === "failed") expect(r4.error).toMatch(/intent/i);
  });
});

// --- AC-600 -----------------------------------------------------------------

describe("UAT AC-600: a repeat analysis of the same URL within 24h returns the cached digest without re-fetching or re-running commentary", () => {
  it("test_UAT_AC600_repeat_analysis_returns_cached_digest_hit", async () => {
    const h = makeHarness({ claudeApiKey: "model-key" });
    h.setHtmlBody(loadFixture("plain-html-site"));
    h.setAnthropicCommentary({
      summary: "First-call commentary.",
      perSection: {},
      whatsMissing: [],
    });

    const first = await h.invoke({ url: TARGET_URL });
    expect(first.status).toBe("ok");
    if (first.status !== "ok") return;
    expect((first.payload as { cache: string }).cache).toBe("MISS");
    const anthropicAfterFirst = h.anthropicCalls;
    const fetchesAfterFirst = h.fetchCalls.length;
    expect(anthropicAfterFirst).toBeGreaterThan(0); // commentary ran on the miss

    const second = await h.invoke({ url: TARGET_URL });
    expect(second.status).toBe("ok");
    if (second.status !== "ok") return;
    expect((second.payload as { cache: string }).cache).toBe("HIT");
    // The cached digest is byte-identical to the first one.
    expect((second.payload as { digest: unknown }).digest).toEqual(
      (first.payload as { digest: unknown }).digest,
    );
    // No new page fetch and no new commentary call on the second invocation.
    expect(h.fetchCalls.length).toBe(fetchesAfterFirst);
    expect(h.anthropicCalls).toBe(anthropicAfterFirst);
  });
});

// --- AC-601 -----------------------------------------------------------------

describe("UAT AC-601: every fetch-safety failure is returned as a typed error, never an uncaught exception", () => {
  it("test_UAT_AC601_safety_failures_surface_as_typed_errors", async () => {
    // robots.txt disallow.
    const robots = makeHarness();
    robots.setRobotsBlocked(true);
    robots.setHtmlBody(loadFixture("plain-html-site"));
    const rRobots = await robots.invoke({ url: TARGET_URL });
    expect(rRobots.status).toBe("failed");
    if (rRobots.status === "failed") expect(rRobots.error).toMatch(/robots/i);

    // Exhausted rate-limit window.
    const rated = makeHarness();
    rated.setHtmlBody(loadFixture("plain-html-site"));
    for (let i = 0; i < DEFAULT_RATE_LIMITS.burstMax; i++) {
      await checkRateLimit(
        { FETCH_RATE_KV: rated.env.FETCH_RATE_KV },
        "acct-test",
      );
    }
    const rRate = await rated.invoke({ url: TARGET_URL });
    expect(rRate.status).toBe("failed");
    if (rRate.status === "failed") expect(rRate.error).toMatch(/rate limit/i);

    // SSRF / private-IP host rejected by safeFetch.
    const ssrf = makeHarness();
    ssrf.setHtmlBody(loadFixture("plain-html-site"));
    const rSsrf = await ssrf.invoke({ url: "https://127.0.0.1/" });
    expect(rSsrf.status).toBe("failed");
    if (rSsrf.status === "failed") {
      expect(rSsrf.error).toMatch(/safefetch|private_ip/i);
    }

    // Reaching here at all proves none of the invocations threw — the handler
    // resolves every safety failure to a typed `failed` result.
  });
});

// --- AC-602 -----------------------------------------------------------------

describe("UAT AC-602: robots.txt disallow blocks analysis with a typed failure naming the origin", () => {
  it("test_UAT_AC602_robots_disallow_blocks_with_typed_failure", async () => {
    const h = makeHarness();
    h.setRobotsBlocked(true);
    h.setHtmlBody(loadFixture("plain-html-site"));

    const result = await h.invoke({ url: TARGET_URL });

    expect(result.status).toBe("failed");
    if (result.status !== "failed") return;
    expect(result.error).toMatch(/robots\.txt/i);
    expect(result.error).toContain("x.test"); // disallowing origin / rejected URL
    // robots.txt was consulted but the page body itself was never fetched.
    const pageFetched = h.fetchCalls.some((c) => c.url === TARGET_URL);
    expect(pageFetched).toBe(false);
  });
});

// --- AC-603 -----------------------------------------------------------------

describe("UAT AC-603: rate-limit exhaustion blocks analysis with a typed failure carrying a retry hint", () => {
  it("test_UAT_AC603_rate_limit_exhaustion_blocks_with_retry_hint", async () => {
    const h = makeHarness();
    h.setHtmlBody(loadFixture("plain-html-site"));
    // Exhaust the burst window for this account before analyzing.
    for (let i = 0; i < DEFAULT_RATE_LIMITS.burstMax; i++) {
      await checkRateLimit({ FETCH_RATE_KV: h.env.FETCH_RATE_KV }, "acct-test");
    }

    const result = await h.invoke({ url: TARGET_URL });

    expect(result.status).toBe("failed");
    if (result.status !== "failed") return;
    expect(result.error).toMatch(/window=/); // names the exhausted window
    expect(result.error).toMatch(/retry in \d+s/); // retry-after duration in seconds
    // The page body is not fetched once the rate limit is exhausted.
    const pageFetched = h.fetchCalls.some((c) => c.url === TARGET_URL);
    expect(pageFetched).toBe(false);
  });
});

// --- AC-604 -----------------------------------------------------------------

describe("UAT AC-604: digest commentary is produced by the AI pass, with a deterministic fallback that never fails analysis", () => {
  it("test_UAT_AC604_ai_commentary_with_deterministic_fallback", async () => {
    // (1) No model key → deterministic fallback summary, empty perSection, no AI call.
    const noKey = makeHarness({ claudeApiKey: null });
    noKey.setHtmlBody(loadFixture("plain-html-site"));
    const r1 = await noKey.invoke({ url: TARGET_URL });
    expect(r1.status).toBe("ok");
    if (r1.status !== "ok") return;
    const d1 = (r1.payload as { digest: { summary: string; commentary: { perSection: Record<string, string>; whatsMissing: string[] } } }).digest;
    expect(d1.summary).toContain("Reference digest for");
    expect(d1.summary).toContain(TARGET_URL);
    expect(Object.keys(d1.commentary.perSection)).toHaveLength(0);
    expect(Array.isArray(d1.commentary.whatsMissing)).toBe(true);
    expect(noKey.anthropicCalls).toBe(0);

    // (2) Model key but a non-2xx / malformed model response → same deterministic fallback.
    const badModel = makeHarness({ claudeApiKey: "model-key" });
    badModel.setHtmlBody(loadFixture("plain-html-site"));
    badModel.setAnthropicCommentary(null); // harness replies 503
    const r2 = await badModel.invoke({ url: TARGET_URL });
    expect(r2.status).toBe("ok");
    if (r2.status !== "ok") return;
    const d2 = (r2.payload as { digest: { summary: string; commentary: { perSection: Record<string, string> } } }).digest;
    expect(d2.summary).toContain("Reference digest for");
    expect(Object.keys(d2.commentary.perSection)).toHaveLength(0);
    expect(badModel.anthropicCalls).toBe(1); // it tried, then fell back

    // (3) Valid model JSON → digest reflects the model output.
    const goodModel = makeHarness({ claudeApiKey: "model-key" });
    goodModel.setHtmlBody(loadFixture("plain-html-site"));
    goodModel.setAnthropicCommentary({
      summary: "AI-authored one-liner about the reference.",
      perSection: { palette: "Bold green accents on white." },
      whatsMissing: ["Add a stronger typographic hierarchy."],
    });
    const r3 = await goodModel.invoke({ url: TARGET_URL });
    expect(r3.status).toBe("ok");
    if (r3.status !== "ok") return;
    const d3 = (r3.payload as { digest: { summary: string; commentary: { perSection: Record<string, string>; whatsMissing: string[] } } }).digest;
    expect(d3.summary).toBe("AI-authored one-liner about the reference.");
    expect(d3.commentary.perSection.palette).toBe("Bold green accents on white.");
    expect(d3.commentary.whatsMissing).toContain(
      "Add a stronger typographic hierarchy.",
    );
  });
});

// --- chat-flow ACs (605, 606) ----------------------------------------------

interface ChatToolCall {
  name: string;
  input: Record<string, unknown>;
  result:
    | { ok: true; applied: { tool: string; kind?: string; data?: unknown } }
    | { ok: false; error: unknown };
}
interface ChatBody {
  text: string;
  toolCalls: ChatToolCall[];
  systemActions: Array<{ name: string; result: { status: string } }>;
}

const ANTHROPIC_URL = "https://anthropic.test/v1/messages";

/**
 * Unified fetch stub for the chat path: serves the Anthropic chat turns (the
 * requests that carry a `tools` array), the analyze_page Haiku commentary call
 * (an Anthropic request WITHOUT `tools`), robots.txt, and the target HTML.
 */
function installChatFetch(
  chatTurns: Array<{ content: unknown[] }>,
  html: string,
): void {
  let chatTurn = 0;
  const commentary = {
    summary: "Acme: a clean static landing page with hero and contact form.",
    perSection: { palette: "Bright green on white." },
    whatsMissing: [],
  };
  globalThis.fetch = vi.fn(async (input: unknown, init?: unknown) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;
    if (url === ANTHROPIC_URL) {
      const bodyText = (init as { body?: string } | undefined)?.body;
      const reqBody =
        typeof bodyText === "string" ? JSON.parse(bodyText) : {};
      if (Array.isArray(reqBody.tools)) {
        const r = chatTurns[Math.min(chatTurn, chatTurns.length - 1)];
        chatTurn++;
        // The chat handler consumes Anthropic's streaming SSE protocol — serve
        // the scripted chat turn as SSE (the no-tools commentary call below
        // stays plain JSON, as the analyze_page action parses it directly).
        return new Response(
          encodeAnthropicSSE({
            id: `msg_${chatTurn}`,
            content: r.content as StubContentBlock[],
          }),
          { status: 200, headers: { "content-type": "text/event-stream" } },
        );
      }
      // analyze_page commentary call.
      return new Response(
        JSON.stringify({ content: [{ type: "text", text: JSON.stringify(commentary) }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (url.endsWith("/robots.txt")) return new Response("", { status: 200 });
    if (url === TARGET_URL) {
      return new Response(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return new Response("not stubbed: " + url, { status: 404 });
  }) as unknown as typeof fetch;
}

const CHAT_SESSION_ID = "sess_chat";

function chatEnv(): Record<string, unknown> {
  return {
    CLAUDE_API_KEY: "test-key",
    ANTHROPIC_API_URL: ANTHROPIC_URL,
    FETCH_CACHE_KV: makeMemKv(),
    FETCH_ROBOTS_KV: makeMemKv(),
    FETCH_RATE_KV: makeMemKv(),
    // Server-resident transcript: an in-memory D1 stub stands in for SITES_DB
    // (these tests stub globalThis.fetch, which deadlocks Miniflare's D1 proxy).
    SITES_DB: makeStubChatDb({ sessionId: CHAT_SESSION_ID }).binding,
  };
}

function chatRequest(): Request {
  return new Request("https://app.1stcontact.io/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-session-id": "session-chat" },
    body: JSON.stringify({
      sessionId: CHAT_SESSION_ID,
      userMessage: `please analyze ${TARGET_URL} as a reference`,
      siteDefinition: { businessName: "Acme", pages: [] },
      frameworkCatalog: { modules: [], themeTokenNames: [] },
    }),
  });
}

describe("UAT AC-605: a successful analysis through chat surfaces a kind-tagged reference_digest tool_result", () => {
  it("test_UAT_AC605_chat_success_surfaces_kind_tagged_reference_digest", async () => {
    const originalFetch = globalThis.fetch;
    try {
      installChatFetch(
        [
          {
            content: [
              {
                type: "tool_use",
                id: "toolu_analyze",
                name: "analyze_page",
                input: { url: TARGET_URL },
              },
            ],
          },
          { content: [{ type: "text", text: "Reference digest is ready." }] },
        ],
        loadFixture("plain-html-site"),
      );

      const response = await handleChatRequest(
        chatRequest(),
        chatEnv() as never,
      );
      expect(response.status).toBe(200);
      const consumed = await consumeChatSSE(response);
      const body = consumed.done as unknown as ChatBody;

      const call = body.toolCalls.find((c) => c.name === "analyze_page");
      expect(call).toBeDefined();
      expect(call!.result.ok).toBe(true);
      if (!call!.result.ok) return;
      expect(call!.result.applied.kind).toBe("reference_digest");
      const data = call!.result.applied.data as { digest: { sourceUrl: string } };
      expect(data.digest).toBeDefined();
      expect(data.digest.sourceUrl).toBe(TARGET_URL);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("UAT AC-606: kind-tagged system-action results surface to the front-end dispatcher; the legacy no-kind read tool does not", () => {
  it("test_UAT_AC606_kind_tagged_surfaces_legacy_read_does_not", async () => {
    const originalFetch = globalThis.fetch;
    try {
      installChatFetch(
        [
          {
            content: [
              {
                type: "tool_use",
                id: "toolu_analyze",
                name: "analyze_page",
                input: { url: TARGET_URL },
              },
              {
                type: "tool_use",
                id: "toolu_read",
                name: "get_site_definition",
                input: {},
              },
              {
                type: "tool_use",
                id: "toolu_fail",
                name: "analyze_page",
                input: { url: "not-a-valid-url" },
              },
            ],
          },
          { content: [{ type: "text", text: "Done." }] },
        ],
        loadFixture("plain-html-site"),
      );

      const response = await handleChatRequest(
        chatRequest(),
        chatEnv() as never,
      );
      expect(response.status).toBe(200);
      const consumed = await consumeChatSSE(response);
      const body = consumed.done as unknown as ChatBody;

      // Kind-tagged action surfaces in toolCalls with applied.kind + data.
      const kindCall = body.toolCalls.find(
        (c) => c.result.ok && c.result.applied.kind === "reference_digest",
      );
      expect(kindCall).toBeDefined();

      // A failed system action also surfaces in toolCalls with ok:false.
      const failedCall = body.toolCalls.find((c) => c.result.ok === false);
      expect(failedCall).toBeDefined();

      // The legacy no-kind read tool is ABSENT from toolCalls...
      expect(
        body.toolCalls.some((c) => c.name === "get_site_definition"),
      ).toBe(false);
      // ...but present in the system-actions channel.
      const readAction = body.systemActions.find(
        (s) => s.name === "get_site_definition",
      );
      expect(readAction).toBeDefined();
      expect(readAction!.result.status).toBe("ok");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
