import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { vi } from "vitest";
import {
  analyzePageHandler,
} from "../apps/control-app/src/operator/analyze-page.js";
import type {
  ActionContext,
  ActionResult,
} from "../apps/control-app/src/operator/registry.js";
import { makeMemKv, type MemKv } from "./_helpers_REQ-20_kv.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadFixture(name: string): string {
  return readFileSync(
    join(__dirname, "fixtures", "convert-flow", name, "index.html"),
    "utf8",
  );
}

export interface AnalyzePageHarness {
  env: {
    FETCH_CACHE_KV: MemKv;
    FETCH_ROBOTS_KV: MemKv;
    FETCH_RATE_KV: MemKv;
    CLAUDE_API_KEY?: string;
    ANTHROPIC_API_URL?: string;
  };
  ctx: ActionContext;
  fetchCalls: Array<{ url: string; init?: RequestInit }>;
  anthropicCalls: number;
  setHtmlBody(body: string, status?: number): void;
  setAnthropicCommentary(commentary: {
    summary?: string;
    perSection?: Record<string, string>;
    whatsMissing?: string[];
  } | null): void;
  setRobotsBlocked(blocked: boolean): void;
  invoke(input: Record<string, unknown>): Promise<ActionResult>;
}

export function makeHarness(opts?: {
  operatorLastMessage?: string | null;
  claudeApiKey?: string | null;
  accountId?: string;
}): AnalyzePageHarness {
  const env = {
    FETCH_CACHE_KV: makeMemKv(),
    FETCH_ROBOTS_KV: makeMemKv(),
    FETCH_RATE_KV: makeMemKv(),
    CLAUDE_API_KEY: opts?.claudeApiKey === undefined ? undefined : (opts.claudeApiKey ?? undefined),
    ANTHROPIC_API_URL: "https://anthropic.test/v1/messages",
  };

  const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
  let htmlBody = "<!doctype html><html><body></body></html>";
  let htmlStatus = 200;
  let anthropicCommentary: {
    summary?: string;
    perSection?: Record<string, string>;
    whatsMissing?: string[];
  } | null = null;
  let robotsBlocked = false;
  let anthropicCalls = 0;

  const fetchImpl = async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const urlString =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    fetchCalls.push({ url: urlString, init });

    if (urlString.endsWith("/robots.txt")) {
      const body = robotsBlocked ? "User-agent: *\nDisallow: /" : "";
      return new Response(body, { status: 200 });
    }

    if (urlString === env.ANTHROPIC_API_URL) {
      anthropicCalls++;
      if (!anthropicCommentary) {
        return new Response("upstream error", { status: 503 });
      }
      const text = JSON.stringify(anthropicCommentary);
      return new Response(
        JSON.stringify({
          content: [{ type: "text", text }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    return new Response(htmlBody, {
      status: htmlStatus,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  };

  const stubGlobalFetch = (): (() => void) => {
    const original = globalThis.fetch;
    globalThis.fetch = fetchImpl as typeof fetch;
    return () => {
      globalThis.fetch = original;
    };
  };

  const ctx: ActionContext = {
    session: {
      session_id: "session-test",
      account_id: opts?.accountId ?? "acct-test",
      plan_tier: "trial",
    },
    env: env as unknown as ActionContext["env"],
    emit: vi.fn(),
    siteDefinition: null,
    operatorLastMessage:
      opts?.operatorLastMessage === undefined
        ? "please analyze https://example.com"
        : opts.operatorLastMessage,
    requestOrigin: "https://app.test",
  };

  return {
    env,
    ctx,
    fetchCalls,
    get anthropicCalls(): number {
      return anthropicCalls;
    },
    setHtmlBody(body: string, status = 200): void {
      htmlBody = body;
      htmlStatus = status;
    },
    setAnthropicCommentary(commentary): void {
      anthropicCommentary = commentary;
    },
    setRobotsBlocked(blocked: boolean): void {
      robotsBlocked = blocked;
    },
    async invoke(input: Record<string, unknown>): Promise<ActionResult> {
      const unstub = stubGlobalFetch();
      try {
        return await analyzePageHandler(input, ctx);
      } finally {
        unstub();
      }
    },
  };
}
