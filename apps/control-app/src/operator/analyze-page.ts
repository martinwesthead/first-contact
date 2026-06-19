import {
  deriveWhatsMissing,
  extractSignals,
  renderDigestMarkdown,
  SCHEMA_VERSION,
  shouldEscalateToRendered,
  type ReferenceDigest,
} from "@1stcontact/extractor";
import {
  checkRateLimit,
  operatorMessageImpliesIntent,
  RobotsTxtCache,
  safeFetch,
  verifyIntentToken,
} from "@1stcontact/web-fetch-safety";
import type { ActionContext, ActionHandler, ActionResult } from "./registry.js";

const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const DIGEST_CACHE_TTL_SECONDS = 24 * 60 * 60;

interface AnalyzePageEnv {
  readonly FETCH_CACHE_KV?: KVNamespace;
  readonly FETCH_ROBOTS_KV?: KVNamespace;
  readonly FETCH_RATE_KV?: KVNamespace;
  readonly CLAUDE_API_KEY?: string;
  readonly ANTHROPIC_API_URL?: string;
}

export const analyzePageHandler: ActionHandler = async (input, ctx) => {
  const url = input.url;
  if (typeof url !== "string" || url.length === 0) {
    return fail("'url' must be a non-empty string");
  }
  try {
    new URL(url);
  } catch {
    return fail(`'url' is not a valid URL: ${url}`);
  }

  const env = ctx.env as AnalyzePageEnv;

  const intentCheck = await checkOperatorIntent(input, ctx, env);
  if (!intentCheck.ok) return fail(intentCheck.message);

  const cacheKey = await digestCacheKey(url);
  if (env.FETCH_CACHE_KV) {
    const cached = await env.FETCH_CACHE_KV.get(cacheKey, "json");
    if (cached) {
      const digest = cached as ReferenceDigest;
      return ok({
        kind: "reference_digest",
        digest,
        digestMarkdown: renderDigestMarkdown(digest),
        cache: "HIT",
      });
    }
  }

  if (env.FETCH_ROBOTS_KV) {
    const robots = new RobotsTxtCache({ FETCH_ROBOTS_KV: env.FETCH_ROBOTS_KV });
    const allowed = await robots.check(url);
    if (!allowed.allowed) {
      return fail(
        `robots.txt at ${allowed.origin} disallows automated fetch of ${url}`,
      );
    }
  }

  if (env.FETCH_RATE_KV) {
    const decision = await checkRateLimit(
      { FETCH_RATE_KV: env.FETCH_RATE_KV },
      ctx.session.account_id,
    );
    if (!decision.ok) {
      return fail(
        `rate limited (window=${decision.window}); retry in ${decision.retryAfterSeconds}s`,
      );
    }
  }

  if (!env.FETCH_CACHE_KV || !env.FETCH_ROBOTS_KV) {
    return fail(
      "fetch caches not configured (FETCH_CACHE_KV / FETCH_ROBOTS_KV bindings missing)",
    );
  }

  const fetched = await safeFetch(
    url,
    { FETCH_CACHE_KV: env.FETCH_CACHE_KV, FETCH_ROBOTS_KV: env.FETCH_ROBOTS_KV },
    { headers: { "user-agent": "1stcontact-bot" } },
  );
  if (!fetched.ok) {
    return fail(
      `safeFetch failed: ${fetched.reason}${fetched.detail ? ` — ${fetched.detail}` : ""}`,
    );
  }

  const html = decodeBody(fetched.body);
  const signals = extractSignals(html, fetched.finalUrl);

  const baselineWhatsMissing = deriveWhatsMissing(signals);
  const fallbackSummary = buildFallbackSummary(signals, fetched.finalUrl);

  const commentary = await runAiCommentary(env, {
    sourceUrl: fetched.finalUrl,
    signals,
    baselineWhatsMissing,
    fallbackSummary,
  });

  const digest: ReferenceDigest = {
    schemaVersion: SCHEMA_VERSION,
    sourceUrl: fetched.finalUrl,
    fetchedAt: new Date().toISOString(),
    fetchPath: shouldEscalateToRendered({
      schemaVersion: SCHEMA_VERSION,
      sourceUrl: fetched.finalUrl,
      fetchedAt: "",
      fetchPath: "static",
      summary: "",
      signals,
      commentary: { perSection: {}, whatsMissing: baselineWhatsMissing },
      screenshotKeys: {},
    })
      ? "rendered"
      : "static",
    summary: commentary.summary,
    signals,
    commentary: {
      perSection: commentary.perSection,
      whatsMissing: commentary.whatsMissing,
    },
    screenshotKeys: {},
  };

  await env.FETCH_CACHE_KV.put(cacheKey, JSON.stringify(digest), {
    expirationTtl: DIGEST_CACHE_TTL_SECONDS,
  });

  return ok({
    kind: "reference_digest",
    digest,
    digestMarkdown: renderDigestMarkdown(digest),
    cache: "MISS",
  });
};

async function checkOperatorIntent(
  input: Record<string, unknown>,
  ctx: ActionContext,
  env: AnalyzePageEnv,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const token = typeof input.intentToken === "string" ? input.intentToken : null;
  if (token && env.FETCH_RATE_KV && ctx.session.session_id) {
    const verdict = await verifyIntentToken(
      { FETCH_RATE_KV: env.FETCH_RATE_KV },
      { token, sessionId: ctx.session.session_id },
    );
    if (verdict.ok) return { ok: true };
    return {
      ok: false,
      message: `intent token rejected (${verdict.detail ?? "no_detail"})`,
    };
  }
  if (
    ctx.operatorLastMessage &&
    operatorMessageImpliesIntent(ctx.operatorLastMessage)
  ) {
    return { ok: true };
  }
  return {
    ok: false,
    message:
      "operator intent required: paste a URL in chat (or pass a fresh intentToken) before calling analyze_page",
  };
}

async function digestCacheKey(url: string): Promise<string> {
  const data = new TextEncoder().encode(`${url}|${SCHEMA_VERSION}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return `digest:${hex}`;
}

function decodeBody(body: Uint8Array): string {
  try {
    return new TextDecoder("utf-8").decode(body);
  } catch {
    return "";
  }
}

interface CommentaryResult {
  summary: string;
  perSection: Record<string, string>;
  whatsMissing: string[];
}

async function runAiCommentary(
  env: AnalyzePageEnv,
  input: {
    sourceUrl: string;
    signals: import("@1stcontact/extractor").Signals;
    baselineWhatsMissing: string[];
    fallbackSummary: string;
  },
): Promise<CommentaryResult> {
  if (!env.CLAUDE_API_KEY) {
    return {
      summary: input.fallbackSummary,
      perSection: {},
      whatsMissing: input.baselineWhatsMissing,
    };
  }
  const url = env.ANTHROPIC_API_URL ?? "https://api.anthropic.com/v1/messages";
  const prompt = buildCommentaryPrompt(input);
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": env.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: 1024,
        system:
          "You are the 1st Contact reference-digest commentator. Reply with a SINGLE JSON object only — no preamble, no markdown fences. Schema: { \"summary\": string, \"perSection\": { [section: string]: string }, \"whatsMissing\": string[] }. Sections are: palette, typography, layout, imagery, content, assetInventory. Keep each perSection commentary under 200 characters. summary is one sentence (≤ 240 chars). whatsMissing entries are short imperative phrases.",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!resp.ok) {
      return fallback(input);
    }
    const json = (await resp.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text =
      json.content?.find((b) => b.type === "text")?.text ?? "";
    const parsed = tryParseJson(text);
    if (!parsed) return fallback(input);
    return {
      summary:
        typeof parsed.summary === "string" && parsed.summary.length > 0
          ? parsed.summary
          : input.fallbackSummary,
      perSection: isStringRecord(parsed.perSection) ? parsed.perSection : {},
      whatsMissing: Array.isArray(parsed.whatsMissing)
        ? parsed.whatsMissing.filter((s): s is string => typeof s === "string")
        : input.baselineWhatsMissing,
    };
  } catch {
    return fallback(input);
  }
}

function fallback(input: {
  baselineWhatsMissing: string[];
  fallbackSummary: string;
}): CommentaryResult {
  return {
    summary: input.fallbackSummary,
    perSection: {},
    whatsMissing: input.baselineWhatsMissing,
  };
}

function buildCommentaryPrompt(input: {
  sourceUrl: string;
  signals: import("@1stcontact/extractor").Signals;
  baselineWhatsMissing: string[];
}): string {
  const lines: string[] = [];
  lines.push(`Reference URL: ${input.sourceUrl}`);
  lines.push("");
  lines.push("Extracted signals:");
  lines.push("```json");
  lines.push(JSON.stringify(input.signals, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("Deterministic baseline of missing signals:");
  for (const item of input.baselineWhatsMissing) lines.push(`- ${item}`);
  lines.push("");
  lines.push(
    "Produce the JSON commentary object. summary should describe what this site looks like in one sentence (style, layout, content focus). perSection should give 1–2 sentence commentary per signal category. whatsMissing should include the baseline plus any judgment calls (e.g. weak typography signal).",
  );
  return lines.join("\n");
}

function tryParseJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function isStringRecord(v: unknown): v is Record<string, string> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  for (const value of Object.values(v as Record<string, unknown>)) {
    if (typeof value !== "string") return false;
  }
  return true;
}

function buildFallbackSummary(
  signals: import("@1stcontact/extractor").Signals,
  sourceUrl: string,
): string {
  const headingCount = signals.content.headings.length;
  const imgCount = signals.imagery.imgCount;
  const bgCount = signals.imagery.backgroundCount;
  const videoCount = signals.imagery.videoCount;
  return (
    `Static-fetch digest for ${sourceUrl}: ${headingCount} headings, ` +
    `${imgCount} images, ${bgCount} background images, ${videoCount} videos.`
  );
}

function fail(error: string): ActionResult {
  return { status: "failed", error };
}

function ok(payload: Record<string, unknown>): ActionResult {
  return { status: "ok", payload };
}
