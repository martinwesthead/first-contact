import { vi } from "vitest";
import {
  SCHEMA_VERSION,
  NOT_DETECTED,
  type ReferenceDigest,
} from "../packages/extractor/src/index.js";
import { __resetForTests as resetChatMetadata } from "../apps/control-app/src/operator/chat-metadata.js";
import {
  confirmConvertHandler,
  transcribeSiteHandler,
} from "../apps/control-app/src/operator/transcribe-site.js";
import type {
  ActionContext,
  ActionResult,
} from "../apps/control-app/src/operator/registry.js";
import { makeMemKv, type MemKv } from "./_helpers_REQ-20_kv.js";
import { makeMemR2 } from "./_helpers_REQ-20_r2.js";

export interface TranscribeHarness {
  env: {
    FETCH_CACHE_KV: MemKv;
    FETCH_ROBOTS_KV: MemKv;
    FETCH_RATE_KV: MemKv;
    ASSETS_BUCKET: R2Bucket;
    CLAUDE_API_KEY?: string;
    ANTHROPIC_API_URL?: string;
  };
  ctx: ActionContext;
  events: Array<{ event: string; data: Record<string, unknown> }>;
  setAnthropicResponse(text: string): void;
  setAnthropicSequence(texts: ReadonlyArray<string>): void;
  setAssetResponses(map: Record<string, { status: number; contentType: string; body: Uint8Array }>): void;
  setAssetFailures(map: Record<string, { reason: string; detail?: string }>): void;
  seedDigest(url: string, digest?: Partial<ReferenceDigest>): Promise<ReferenceDigest>;
  invokeConfirm(input: Record<string, unknown>): Promise<ActionResult>;
  invokeTranscribe(input: Record<string, unknown>): Promise<ActionResult>;
}

export function makeTranscribeHarness(opts?: {
  sessionId?: string;
  accountId?: string;
  claudeApiKey?: string | null;
}): TranscribeHarness {
  resetChatMetadata();
  const env = {
    FETCH_CACHE_KV: makeMemKv(),
    FETCH_ROBOTS_KV: makeMemKv(),
    FETCH_RATE_KV: makeMemKv(),
    ASSETS_BUCKET: makeMemR2(),
    CLAUDE_API_KEY: opts?.claudeApiKey === null ? undefined : (opts?.claudeApiKey ?? "test-key"),
    ANTHROPIC_API_URL: "https://anthropic.test/v1/messages",
  };

  let anthropicQueue: string[] = [];
  let assetResponses: Record<string, { status: number; contentType: string; body: Uint8Array }> = {};
  let assetFailures: Record<string, { reason: string; detail?: string }> = {};
  const events: Array<{ event: string; data: Record<string, unknown> }> = [];

  const stubFetch = async (
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
      const next = anthropicQueue.shift();
      if (next === undefined) {
        return new Response("upstream error", { status: 503 });
      }
      return new Response(
        JSON.stringify({ content: [{ type: "text", text: next }] }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }
    // Asset responses (Stage 4 downloads).
    if (urlString.endsWith("/robots.txt")) {
      return new Response("", { status: 200 });
    }
    const f = assetFailures[urlString];
    if (f) {
      if (f.reason === "body_too_large") {
        // Simulate a 6MB body — safeFetch will reject.
        const bytes = new Uint8Array(6 * 1024 * 1024);
        return new Response(bytes, {
          status: 200,
          headers: { "content-type": "image/png" },
        });
      }
      // Other reasons: 404 / 500 / etc.
      return new Response("error", { status: 500 });
    }
    const a = assetResponses[urlString];
    if (a) {
      return new Response(a.body, {
        status: a.status,
        headers: { "content-type": a.contentType },
      });
    }
    return new Response("not found", { status: 404 });
  };

  const stubGlobalFetch = (): (() => void) => {
    const original = globalThis.fetch;
    globalThis.fetch = stubFetch as typeof fetch;
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
    emit: vi.fn((event: { event: string; data: Record<string, unknown> }) => {
      events.push(event);
    }),
    siteDefinition: null,
    operatorLastMessage: "please convert https://acme.test/",
  };

  return {
    env,
    ctx,
    events,
    setAnthropicResponse(text: string): void {
      anthropicQueue = [text];
    },
    setAnthropicSequence(texts: ReadonlyArray<string>): void {
      anthropicQueue = [...texts];
    },
    setAssetResponses(map): void {
      assetResponses = map;
    },
    setAssetFailures(map): void {
      assetFailures = map;
    },
    async seedDigest(
      url: string,
      digestOverrides?: Partial<ReferenceDigest>,
    ): Promise<ReferenceDigest> {
      const digest: ReferenceDigest = {
        schemaVersion: SCHEMA_VERSION,
        sourceUrl: url,
        fetchedAt: "2026-06-18T00:00:00.000Z",
        fetchPath: "rendered",
        summary: "Test digest",
        signals: {
          palette: {
            background: "#ffffff",
            body: "#222222",
            accent: "#16a34a",
            cta: "#2563eb",
            supporting: [],
          },
          typography: {
            body: { family: "Inter", size: NOT_DETECTED, weight: NOT_DETECTED },
            h1: { family: "Playfair Display", size: NOT_DETECTED, weight: NOT_DETECTED },
            h2: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
            h3: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
            primaryPair: { body: "Inter", heading: "Playfair Display" },
          },
          layout: { maxContentWidth: 1024, bias: "centered", density: "balanced" },
          imagery: { imgCount: 1, backgroundCount: 0, videoCount: 0, heroDetected: true },
          content: {
            headings: [{ level: 1, text: "Acme Co" }],
            navLinks: [],
            formFields: [],
            listGroupCount: 0,
            sectionCount: 1,
          },
          assetInventory: [],
        },
        commentary: { perSection: {}, whatsMissing: [] },
        screenshotKeys: {},
        ...digestOverrides,
      };
      const data = new TextEncoder().encode(`${url}|1`);
      const hash = await crypto.subtle.digest("SHA-256", data);
      const bytes = new Uint8Array(hash);
      let hex = "";
      for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
      await env.FETCH_CACHE_KV.put(`digest:${hex}`, JSON.stringify(digest));
      return digest;
    },
    async invokeConfirm(input): Promise<ActionResult> {
      const unstub = stubGlobalFetch();
      try {
        return await confirmConvertHandler(input, ctx);
      } finally {
        unstub();
      }
    },
    async invokeTranscribe(input): Promise<ActionResult> {
      const unstub = stubGlobalFetch();
      try {
        return await transcribeSiteHandler(input, ctx);
      } finally {
        unstub();
      }
    },
  };
}

export function validLlmTranscription(args: {
  modules?: ReadonlyArray<Record<string, unknown>>;
  narrative?: string;
}): string {
  const modules = args.modules ?? [
    {
      id: "hero-1",
      type: "hero",
      version: 1,
      variant: "bg-color",
      dials: { size: "lg", align: "center", surface: "default" },
      content: { heading: "Acme Co", subhead: "We help you." },
      confidence: "high",
      source_section: "hero",
    },
    {
      id: "body-1",
      type: "text-block",
      version: 1,
      variant: "prose",
      content: { heading: "About", body: "Some content." },
      confidence: "medium",
      source_section: "about",
    },
  ];
  return JSON.stringify({
    modules,
    narrative: args.narrative ?? "Transcribed two sections.",
  });
}
