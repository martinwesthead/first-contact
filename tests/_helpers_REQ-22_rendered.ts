import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { vi } from "vitest";
import {
  analyzePageHandler,
} from "../apps/control-app/src/operator/analyze-page.js";
import {
  setDriverFactoryForTest,
} from "../apps/control-app/src/operator/browser-driver.js";
import type {
  BrowserDriver,
  ComputedBackgroundAsset,
  ComputedBoundingBoxes,
  ComputedFontAsset,
  ComputedStyles,
  DriverResult,
  Viewport,
  ViewportName,
} from "../packages/extractor/src/index.js";
import type {
  ActionContext,
  ActionResult,
} from "../apps/control-app/src/operator/registry.js";
import { makeMemKv, type MemKv } from "./_helpers_REQ-20_kv.js";
import { makeMemR2 } from "./_helpers_REQ-20_r2.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadFixture(name: string, file = "index.html"): string {
  return readFileSync(
    join(__dirname, "fixtures", "convert-flow", name, file),
    "utf8",
  );
}

export interface FakeDriverConfig {
  html: string;
  computedStyles: ComputedStyles;
  computedBackgroundAssets: readonly ComputedBackgroundAsset[];
  screenshotPngs: Partial<Record<ViewportName, Uint8Array>>;
  durationSeconds?: number;
  /** REQ-49 — optional rendered-time font URLs the fake driver returns. */
  computedFontAssets?: readonly ComputedFontAsset[];
  /** REQ-49 — optional bounding boxes for hero/nav/sections/cards. */
  boundingBoxes?: ComputedBoundingBoxes;
}

export function makeFakeDriver(config: FakeDriverConfig): BrowserDriver {
  return {
    async renderForViewports(
      _url: string,
      viewports: readonly Viewport[],
    ): Promise<DriverResult> {
      const screenshots: Partial<Record<ViewportName, Uint8Array>> = {};
      for (const vp of viewports) {
        const png = config.screenshotPngs[vp.name];
        if (png) screenshots[vp.name] = png;
      }
      return {
        html: config.html,
        computedStyles: config.computedStyles,
        computedBackgroundAssets: [...config.computedBackgroundAssets],
        computedFontAssets: config.computedFontAssets
          ? [...config.computedFontAssets]
          : [],
        boundingBoxes: config.boundingBoxes ?? { sections: [], cards: [] },
        screenshots,
        durationSeconds: config.durationSeconds ?? 4,
      };
    },
  };
}

/** Minimal 1x1 PNG byte sequence — valid PNG header + IHDR + IDAT + IEND. */
export const TINY_PNG: Uint8Array = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

export interface AnalyzePageHarness {
  env: {
    FETCH_CACHE_KV: MemKv;
    FETCH_ROBOTS_KV: MemKv;
    FETCH_RATE_KV: MemKv;
    BROWSER_BUDGET_KV: MemKv;
    ASSETS_BUCKET: R2Bucket;
    BROWSER: unknown;
    CLAUDE_API_KEY?: string;
    ANTHROPIC_API_URL?: string;
  };
  ctx: ActionContext;
  fetchCalls: Array<{ url: string; init?: RequestInit }>;
  anthropicCalls: Array<{ body: unknown }>;
  setHtmlBody(body: string, status?: number): void;
  setAnthropicCommentary(commentary: {
    summary?: string;
    perSection?: Record<string, string>;
    whatsMissing?: string[];
  } | null): void;
  setRobotsBlocked(blocked: boolean): void;
  installDriver(driver: BrowserDriver | null): void;
  invoke(input: Record<string, unknown>): Promise<ActionResult>;
}

export function makeHarness(opts?: {
  operatorLastMessage?: string | null;
  claudeApiKey?: string | null;
  accountId?: string;
  sessionId?: string;
  withBrowserBinding?: boolean;
}): AnalyzePageHarness {
  const env = {
    FETCH_CACHE_KV: makeMemKv(),
    FETCH_ROBOTS_KV: makeMemKv(),
    FETCH_RATE_KV: makeMemKv(),
    BROWSER_BUDGET_KV: makeMemKv(),
    ASSETS_BUCKET: makeMemR2(),
    BROWSER: opts?.withBrowserBinding === false ? undefined : { __fake: true },
    CLAUDE_API_KEY:
      opts?.claudeApiKey === undefined ? undefined : opts.claudeApiKey ?? undefined,
    ANTHROPIC_API_URL: "https://anthropic.test/v1/messages",
  };

  const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
  const anthropicCalls: Array<{ body: unknown }> = [];
  let htmlBody = "<!doctype html><html><body></body></html>";
  let htmlStatus = 200;
  let anthropicCommentary: {
    summary?: string;
    perSection?: Record<string, string>;
    whatsMissing?: string[];
  } | null = null;
  let robotsBlocked = false;

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
      const parsedBody = init?.body ? safeJson(init.body) : null;
      anthropicCalls.push({ body: parsedBody });
      if (!anthropicCommentary) {
        return new Response("upstream error", { status: 503 });
      }
      const text = JSON.stringify(anthropicCommentary);
      return new Response(
        JSON.stringify({ content: [{ type: "text", text }] }),
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
      session_id: opts?.sessionId ?? "session-test",
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
  };

  return {
    env,
    ctx,
    fetchCalls,
    anthropicCalls,
    setHtmlBody(body, status = 200): void {
      htmlBody = body;
      htmlStatus = status;
    },
    setAnthropicCommentary(commentary): void {
      anthropicCommentary = commentary;
    },
    setRobotsBlocked(blocked): void {
      robotsBlocked = blocked;
    },
    installDriver(driver): void {
      setDriverFactoryForTest(driver ? () => driver : null);
    },
    async invoke(input): Promise<ActionResult> {
      const unstub = stubGlobalFetch();
      try {
        return await analyzePageHandler(input, ctx);
      } finally {
        unstub();
        setDriverFactoryForTest(null);
      }
    },
  };
}

function safeJson(body: BodyInit): unknown {
  try {
    return typeof body === "string" ? JSON.parse(body) : null;
  } catch {
    return null;
  }
}
