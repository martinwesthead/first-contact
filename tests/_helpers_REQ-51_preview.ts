import { vi } from "vitest";
import type { Site } from "@gendev/site-schema";
import { buildEmptyScaffold } from "@gendev/builder-ui";
import {
  previewGeneratedPageHandler,
} from "../apps/control-app/src/operator/preview-generated-page.js";
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
  ReferenceDigest,
  Viewport,
  ViewportName,
} from "../packages/extractor/src/index.js";
import { SCHEMA_VERSION } from "../packages/extractor/src/index.js";
import type {
  ActionContext,
  ActionResult,
} from "../apps/control-app/src/operator/registry.js";
import { makeMemKv, type MemKv } from "./_helpers_REQ-20_kv.js";
import { makeMemR2 } from "./_helpers_REQ-20_r2.js";

/** Minimal 1x1 PNG byte sequence — valid PNG header + IHDR + IDAT + IEND. */
export const TINY_PNG: Uint8Array = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

export interface FakeDriverConfig {
  html?: string;
  computedStyles?: ComputedStyles;
  computedBackgroundAssets?: readonly ComputedBackgroundAsset[];
  screenshotPngs?: Partial<Record<ViewportName, Uint8Array>>;
  durationSeconds?: number;
  computedFontAssets?: readonly ComputedFontAsset[];
  boundingBoxes?: ComputedBoundingBoxes;
}

const DEFAULT_COMPUTED_STYLES: ComputedStyles = {
  body: { family: "Inter", size: "16px", weight: "400", backgroundColor: "#ffffff" },
  h1: { family: "Inter", size: "48px", weight: "700" },
  h2: { family: "Inter", size: "32px", weight: "700" },
  h3: { family: "Inter", size: "24px", weight: "600" },
  primaryBackgroundColor: "#ffffff",
};

export function makeFakeDriver(config: FakeDriverConfig = {}): BrowserDriver {
  return {
    async renderForViewports(
      _url: string,
      viewports: readonly Viewport[],
    ): Promise<DriverResult> {
      const defaults: Partial<Record<ViewportName, Uint8Array>> = {
        mobile: TINY_PNG,
        tablet: TINY_PNG,
        desktop: TINY_PNG,
      };
      const screenshotPngs = config.screenshotPngs ?? defaults;
      const screenshots: Partial<Record<ViewportName, Uint8Array>> = {};
      for (const vp of viewports) {
        const png = screenshotPngs[vp.name];
        if (png) screenshots[vp.name] = png;
      }
      return {
        html: config.html ?? "<!doctype html><html><body><h1>Preview</h1></body></html>",
        computedStyles: config.computedStyles ?? DEFAULT_COMPUTED_STYLES,
        computedBackgroundAssets: config.computedBackgroundAssets
          ? [...config.computedBackgroundAssets]
          : [],
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

export interface PreviewHarness {
  env: {
    FETCH_CACHE_KV: MemKv;
    BROWSER_BUDGET_KV: MemKv;
    ASSETS_BUCKET: R2Bucket;
    BROWSER: unknown;
    CLAUDE_API_KEY?: string;
    ANTHROPIC_API_URL?: string;
  };
  ctx: ActionContext;
  anthropicCalls: Array<{ body: unknown }>;
  installDriver(driver: BrowserDriver | null): void;
  setAnthropicResponse(payload: {
    summary?: string;
    perSection?: Record<string, string>;
    inspirationDelta?: string;
  } | null): void;
  /** Seed a cached ReferenceDigest under the digest:{sha256(url|SCHEMA_VERSION)} key. */
  seedReferenceDigest(url: string, overrides?: Partial<ReferenceDigest>): Promise<string>;
  invoke(input: Record<string, unknown>): Promise<ActionResult>;
}

export function makePreviewHarness(opts?: {
  site?: Site;
  accountId?: string;
  sessionId?: string;
  withBrowserBinding?: boolean;
  claudeApiKey?: string | null;
  requestOrigin?: string | null;
}): PreviewHarness {
  const env = {
    FETCH_CACHE_KV: makeMemKv(),
    BROWSER_BUDGET_KV: makeMemKv(),
    ASSETS_BUCKET: makeMemR2(),
    BROWSER: opts?.withBrowserBinding === false ? undefined : { __fake: true },
    CLAUDE_API_KEY:
      opts?.claudeApiKey === null
        ? undefined
        : (opts?.claudeApiKey ?? "test-key"),
    ANTHROPIC_API_URL: "https://anthropic.test/v1/messages",
  };

  const anthropicCalls: Array<{ body: unknown }> = [];
  let anthropicResponse: {
    summary?: string;
    perSection?: Record<string, string>;
    inspirationDelta?: string;
  } | null = {
    summary: "Generated preview shows a left-aligned hero with sparse density.",
    perSection: {},
  };

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
    if (urlString === env.ANTHROPIC_API_URL) {
      anthropicCalls.push({
        body: init?.body && typeof init.body === "string" ? JSON.parse(init.body) : null,
      });
      if (!anthropicResponse) {
        return new Response("upstream error", { status: 503 });
      }
      const text = JSON.stringify(anthropicResponse);
      return new Response(
        JSON.stringify({ content: [{ type: "text", text }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return new Response("not stubbed", { status: 404 });
  };

  const stubGlobalFetch = (): (() => void) => {
    const original = globalThis.fetch;
    globalThis.fetch = fetchImpl as typeof fetch;
    return () => {
      globalThis.fetch = original;
    };
  };

  const site = opts?.site ?? buildEmptyScaffold({ businessName: "Acme Co" });

  const ctx: ActionContext = {
    session: {
      session_id: opts?.sessionId ?? "sess-r51",
      account_id: opts?.accountId ?? "acct-r51",
      plan_tier: "trial",
    },
    env: env as unknown as ActionContext["env"],
    emit: vi.fn(),
    siteDefinition: site,
    operatorLastMessage: "show me what you made",
    requestOrigin: opts?.requestOrigin === null ? null : (opts?.requestOrigin ?? "https://app.test"),
  };

  return {
    env,
    ctx,
    anthropicCalls,
    installDriver(driver): void {
      setDriverFactoryForTest(driver ? () => driver : null);
    },
    setAnthropicResponse(payload): void {
      anthropicResponse = payload;
    },
    async seedReferenceDigest(
      url: string,
      overrides?: Partial<ReferenceDigest>,
    ): Promise<string> {
      const digest: ReferenceDigest = {
        schemaVersion: SCHEMA_VERSION,
        sourceUrl: url,
        fetchedAt: "2026-06-20T00:00:00.000Z",
        fetchPath: "rendered",
        summary: "Inspiration: centered hero, dense layout, warm palette.",
        signals: {
          palette: {
            background: "#fff5e6",
            body: "#222222",
            accent: "#d97706",
            cta: "#16a34a",
            supporting: [],
          },
          typography: {
            body: { family: "Georgia", size: "16px", weight: "400" },
            h1: { family: "Playfair", size: "56px", weight: "700" },
            h2: { family: "Playfair", size: "36px", weight: "700" },
            h3: { family: "Playfair", size: "24px", weight: "700" },
            primaryPair: { heading: "Playfair", body: "Georgia" },
          },
          layout: { maxContentWidth: 1100, bias: "centered", density: "dense" },
          imagery: { imgCount: 3, backgroundCount: 1, videoCount: 0, heroDetected: true },
          content: {
            headings: [{ level: 1, text: "Welcome" }],
            navLinks: [],
            formFields: [],
            listGroupCount: 0,
            sectionCount: 3,
          },
          assetInventory: [],
        },
        commentary: { perSection: {}, whatsMissing: [] },
        screenshotKeys: { desktop: "references/seeded/turn-1/desktop.png" },
        ...overrides,
      };
      // Seed the desktop reference screenshot bytes so the multimodal path can
      // pick up a real second image (mirrors what analyze_page would have
      // written).
      if (digest.screenshotKeys.desktop) {
        await env.ASSETS_BUCKET.put(
          digest.screenshotKeys.desktop,
          TINY_PNG,
          { httpMetadata: { contentType: "image/png" } },
        );
      }
      const cacheData = new TextEncoder().encode(`${url}|${SCHEMA_VERSION}`);
      const hash = await crypto.subtle.digest("SHA-256", cacheData);
      const bytes = new Uint8Array(hash);
      let hex = "";
      for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
      const cacheKey = `digest:${hex}`;
      await env.FETCH_CACHE_KV.put(cacheKey, JSON.stringify(digest));
      return cacheKey;
    },
    async invoke(input): Promise<ActionResult> {
      const unstub = stubGlobalFetch();
      try {
        return await previewGeneratedPageHandler(input, ctx);
      } finally {
        unstub();
        setDriverFactoryForTest(null);
      }
    },
  };
}

/** Convenience: assert that the result is ok and surface the payload. */
export function expectOkPayload(result: ActionResult): Record<string, unknown> {
  if (result.status !== "ok") {
    throw new Error(
      `expected ActionResult ok, got ${result.status}${
        "error" in result ? `: ${result.error}` : ""
      }`,
    );
  }
  return result.payload ?? {};
}
