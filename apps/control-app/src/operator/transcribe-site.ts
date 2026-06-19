import {
  applyTokenPatch,
  buildHeroOnlyFallback,
  buildSiteFromTranscription,
  collectReferencedAssetUrls,
  composePromptForTranscription,
  deriveThemeTokens,
  mirrorAssetBatchToR2,
  parseTranscriptionFromLlm,
  rewriteAssetRefs,
  TRANSCRIPTION_CATALOG,
  validateTranscription,
  type MirrorAssetResult,
  type ReferenceDigest,
  type Transcription,
  type TranscriptionValidationIssue,
} from "@1stcontact/extractor";
import type { Site, ThemeTokens } from "@1stcontact/site-schema";
import type { ActionContext, ActionHandler, ActionResult } from "./registry.js";
import {
  isConvertConfirmed,
  markConvertConfirmed,
} from "./chat-metadata.js";

const OPUS_MODEL = "claude-opus-4-7";

export interface TranscribeSiteEnv {
  readonly FETCH_CACHE_KV?: KVNamespace;
  readonly FETCH_ROBOTS_KV?: KVNamespace;
  readonly FETCH_RATE_KV?: KVNamespace;
  readonly ASSETS_BUCKET?: R2Bucket;
  readonly CLAUDE_API_KEY?: string;
  readonly ANTHROPIC_API_URL?: string;
}

interface CacheLookup {
  readonly digestKey: string;
  readonly digest: ReferenceDigest;
}

/**
 * Resolve a digest record from the FETCH_CACHE_KV. analyze_page writes digests
 * under `digest:{sha256(url|SCHEMA)}`; transcribe_site looks them up by URL.
 * If the URL hasn't been analyzed yet, returns null and the AI is expected
 * to call analyze_page first.
 */
async function loadDigest(
  env: TranscribeSiteEnv,
  url: string,
  schemaVersion: 1,
): Promise<CacheLookup | null> {
  if (!env.FETCH_CACHE_KV) return null;
  const data = new TextEncoder().encode(`${url}|${schemaVersion}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hex = hexOf(hash);
  const digestKey = `digest:${hex}`;
  const cached = await env.FETCH_CACHE_KV.get(digestKey, "json");
  if (!cached) return null;
  return { digestKey, digest: cached as ReferenceDigest };
}

function hexOf(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * Deterministic business name guess from the digest content tree.
 */
function deriveBusinessName(digest: ReferenceDigest): string {
  const h1 = digest.signals.content.headings.find((h) => h.level === 1);
  if (h1 && h1.text.trim()) return h1.text.trim();
  try {
    return new URL(digest.sourceUrl).hostname;
  } catch {
    return "Your Site";
  }
}

export interface TranscribeOptions {
  readonly llmFetch?: typeof fetch;
  readonly mirrorBucketOverride?: R2Bucket;
}

interface OpusResponse {
  readonly raw: string;
}

/**
 * Call Opus with the multimodal transcription prompt. Returns the raw text
 * (caller parses + validates). Throws so the caller can map exceptions to
 * "retry then fallback" semantics.
 */
async function callOpusForTranscription(args: {
  env: TranscribeSiteEnv;
  digest: ReferenceDigest;
  validatorFeedback?: ReadonlyArray<TranscriptionValidationIssue>;
  llmFetch?: typeof fetch;
}): Promise<OpusResponse> {
  const prompt = composePromptForTranscription(args.digest, TRANSCRIPTION_CATALOG);
  const url = args.env.ANTHROPIC_API_URL ?? "https://api.anthropic.com/v1/messages";

  const userBlocks: unknown[] = [];
  if (args.digest.screenshotKeys.desktop && args.env.ASSETS_BUCKET) {
    try {
      const obj = await args.env.ASSETS_BUCKET.get(args.digest.screenshotKeys.desktop);
      if (obj) {
        const buf = await obj.arrayBuffer();
        userBlocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: "image/png",
            data: base64FromBytes(new Uint8Array(buf)),
          },
        });
      }
    } catch {
      // Continue without the screenshot — the prompt still has all signals.
    }
  }
  let userText = prompt.user;
  if (args.validatorFeedback && args.validatorFeedback.length > 0) {
    const feedback = args.validatorFeedback
      .map((i) => `- at ${i.path}: ${i.message}`)
      .join("\n");
    userText += `\n\nYour previous attempt failed validation against the catalog. Fix and try again. Issues:\n${feedback}`;
  }
  userBlocks.push({ type: "text", text: userText });

  const fetchImpl = args.llmFetch ?? globalThis.fetch;
  const resp = await fetchImpl(url, {
    method: "POST",
    headers: {
      "x-api-key": args.env.CLAUDE_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: OPUS_MODEL,
      max_tokens: 4096,
      system: prompt.system,
      messages: [{ role: "user", content: userBlocks }],
    }),
  });
  if (!resp.ok) {
    throw new Error(`anthropic_${resp.status}`);
  }
  const json = (await resp.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = json.content?.find((b) => b.type === "text")?.text ?? "";
  return { raw: text };
}

function base64FromBytes(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/**
 * The two-attempt LLM + fallback contract (AC10, AC11):
 *   - call Opus → parse → validate. If valid: use it.
 *   - if validation fails: call Opus again with the issues fed back.
 *   - if the second attempt fails (or anything throws): return the
 *     hero-only fallback transcription.
 */
async function attemptTranscription(args: {
  env: TranscribeSiteEnv;
  digest: ReferenceDigest;
  llmFetch?: typeof fetch;
}): Promise<{
  readonly transcription: Transcription;
  readonly attempts: number;
  readonly fellBackToHero: boolean;
}> {
  const themeTokens = deriveThemeTokens(args.digest);

  // No LLM key → straight to fallback. Useful in tests / offline.
  if (!args.env.CLAUDE_API_KEY) {
    return {
      transcription: buildHeroOnlyFallback({ digest: args.digest }),
      attempts: 0,
      fellBackToHero: true,
    };
  }

  let firstIssues: ReadonlyArray<TranscriptionValidationIssue> | undefined;
  for (let i = 0; i < 2; i++) {
    try {
      const opus = await callOpusForTranscription({
        env: args.env,
        digest: args.digest,
        validatorFeedback: firstIssues,
        llmFetch: args.llmFetch,
      });
      const parsed = parseTranscriptionFromLlm(opus.raw, themeTokens);
      if (parsed) {
        const result = validateTranscription(parsed);
        if (result.ok) {
          return { transcription: parsed, attempts: i + 1, fellBackToHero: false };
        }
        firstIssues = result.issues;
      } else {
        firstIssues = [{ path: "/", message: "could not parse a JSON object" }];
      }
    } catch {
      // Move on to next attempt or fallback.
      firstIssues = [{ path: "/", message: "anthropic call failed" }];
    }
  }
  return {
    transcription: buildHeroOnlyFallback({ digest: args.digest }),
    attempts: 2,
    fellBackToHero: true,
  };
}

export interface MirrorSummary {
  readonly mirrored: number;
  readonly failed: number;
  readonly failures: ReadonlyArray<{ readonly url: string; readonly reason: string }>;
}

/**
 * Run Stage 4 — the async asset-mirror loop. Emits per-asset SSE events.
 * Returns the summary so the caller can append a final chat note.
 */
async function runStage4(args: {
  ctx: ActionContext;
  env: TranscribeSiteEnv;
  transcription: Transcription;
  siteId: string;
}): Promise<{
  readonly summary: MirrorSummary;
  readonly rewritten: Transcription;
}> {
  const urls = collectReferencedAssetUrls(args.transcription);
  if (urls.length === 0 || !args.env.ASSETS_BUCKET || !args.env.FETCH_CACHE_KV || !args.env.FETCH_ROBOTS_KV) {
    return {
      summary: { mirrored: 0, failed: 0, failures: [] },
      rewritten: args.transcription,
    };
  }
  args.ctx.emit({
    event: "action:notify",
    data: { tool: "transcribe_site", stage: 4, status: "started", total: urls.length },
  });
  const result = await mirrorAssetBatchToR2({
    urls,
    siteId: args.siteId,
    bucket: args.env.ASSETS_BUCKET,
    safetyEnv: {
      FETCH_CACHE_KV: args.env.FETCH_CACHE_KV,
      FETCH_ROBOTS_KV: args.env.FETCH_ROBOTS_KV,
    },
    onResult: (r: MirrorAssetResult) => {
      args.ctx.emit({
        event: "action:notify",
        data: r.ok
          ? {
              tool: "transcribe_site",
              stage: 4,
              status: "asset_mirrored",
              url: r.url,
              r2Key: r.r2Key,
              bytes: r.bytes,
            }
          : {
              tool: "transcribe_site",
              stage: 4,
              status: "asset_failed",
              url: r.url,
              reason: r.reason,
              detail: r.detail,
            },
      });
    },
  });
  const rewritten = rewriteAssetRefs(args.transcription, result.urlToR2Key);
  return {
    summary: {
      mirrored: result.successes.length,
      failed: result.failures.length,
      failures: result.failures.map((f) => ({ url: f.url, reason: f.reason })),
    },
    rewritten,
  };
}

export interface TranscribeSiteOk {
  readonly kind: "transcribe_site_done";
  readonly modules: ReadonlyArray<Transcription["modules"][number]>;
  readonly themeTokens: ThemeTokens;
  readonly site: Site;
  readonly narrative: string;
  readonly assetMirrorSummary: MirrorSummary;
  readonly fellBackToHero: boolean;
}

export interface TranscribeSiteRequiresConfirmation {
  readonly kind: "requires_confirmation";
  readonly url: string;
  readonly confirmationPrompt: string;
}

export const transcribeSiteHandler: ActionHandler = async (input, ctx) => {
  const env = ctx.env as TranscribeSiteEnv;
  const digestId = input.digestId;
  if (typeof digestId !== "string" || digestId.length === 0) {
    return fail("'digestId' must be a non-empty string (URL the digest was built for)");
  }

  if (!ctx.session.session_id) {
    return fail("session_id required to track convert confirmation");
  }

  const lookup = await loadDigest(env, digestId, 1);
  if (!lookup) {
    return fail(
      `digest_not_found: no digest record for ${digestId} — run analyze_page first`,
    );
  }
  const digest = lookup.digest;

  const sessionId = ctx.session.session_id;
  const accountId = ctx.session.account_id;
  const confirmed = isConvertConfirmed({
    sessionId,
    accountId,
    url: digest.sourceUrl,
  });

  if (!confirmed) {
    const confirmationPrompt = `Convert will replace your current draft with a transcription of ${digest.sourceUrl}. This cannot be automatically undone. Continue?`;
    ctx.emit({
      event: "action:notify",
      data: {
        tool: "transcribe_site",
        kind: "convert_confirmation_required",
        url: digest.sourceUrl,
        prompt: confirmationPrompt,
      },
    });
    return ok({
      kind: "convert_confirmation",
      url: digest.sourceUrl,
      prompt: confirmationPrompt,
    });
  }

  // ── Stage 1: screenshot preview ─────────────────────────────────────────
  const screenshotUrl = digest.screenshotKeys.desktop
    ? `/assets/${digest.screenshotKeys.desktop}`
    : null;
  ctx.emit({
    event: "action:notify",
    data: {
      tool: "transcribe_site",
      stage: 1,
      status: "completed",
      screenshot: screenshotUrl,
    },
  });

  // ── Stage 2: theme-token derivation ─────────────────────────────────────
  const tokenPatch = deriveThemeTokens(digest);
  const themeTokens = applyTokenPatch(tokenPatch);
  ctx.emit({
    event: "action:notify",
    data: {
      tool: "transcribe_site",
      stage: 2,
      status: "completed",
      themeTokens,
      confidence: tokenPatch.confidence,
    },
  });

  // ── Stage 3: LLM module transcription ───────────────────────────────────
  const businessName = deriveBusinessName(digest);
  const attempt = await attemptTranscription({ env, digest });
  const siteShape = buildSiteFromTranscription({
    transcription: attempt.transcription,
    themeTokens,
    sourceUrl: digest.sourceUrl,
    businessName,
  });
  if (!siteShape.ok) {
    // The validated transcription failed the full-site gate. This should
    // never happen (validateTranscription is a superset), but if it does we
    // fall back rather than ship invalid state to the client.
    const fallback = buildHeroOnlyFallback({ digest });
    const fbSite = buildSiteFromTranscription({
      transcription: fallback,
      themeTokens,
      sourceUrl: digest.sourceUrl,
      businessName,
    });
    if (!fbSite.ok) {
      return fail(
        `site_validation_failed: even the hero-only fallback failed: ${fbSite.errors.map((e) => `${e.path}:${e.message}`).join("; ")}`,
      );
    }
    ctx.emit({
      event: "action:notify",
      data: {
        tool: "transcribe_site",
        stage: 3,
        status: "completed",
        fellBackToHero: true,
        modules: fallback.modules.length,
        narrative: fallback.narrative,
      },
    });
    const stage4 = await runStage4({
      ctx,
      env,
      transcription: fallback,
      siteId: accountId,
    });
    return ok({
      kind: "transcribe_site_done",
      site: fbSite.value,
      themeTokens,
      modules: fallback.modules,
      narrative: fallback.narrative,
      assetMirrorSummary: stage4.summary,
      fellBackToHero: true,
    });
  }

  ctx.emit({
    event: "action:notify",
    data: {
      tool: "transcribe_site",
      stage: 3,
      status: "completed",
      fellBackToHero: attempt.fellBackToHero,
      modules: attempt.transcription.modules.length,
      narrative: attempt.transcription.narrative,
      lowConfidenceItems: attempt.transcription.modules
        .filter((m) => m.confidence === "low")
        .map((m) => ({
          moduleId: m.id,
          section: m.source_section ?? "",
          reason: "low-confidence module",
        })),
    },
  });

  // ── Stage 4: async asset-mirror ────────────────────────────────────────
  const stage4 = await runStage4({
    ctx,
    env,
    transcription: attempt.transcription,
    siteId: accountId,
  });

  const finalSite: Site = {
    ...siteShape.value,
    pages: siteShape.value.pages.map((p) => ({
      ...p,
      modules: stage4.rewritten.modules.map((m) => ({
        id: m.id,
        type: m.type,
        version: m.version,
        variant: m.variant,
        dials: m.dials,
        content: m.content as Site["pages"][number]["modules"][number]["content"],
      })),
    })),
  };

  return ok({
    kind: "transcribe_site_done",
    site: finalSite,
    themeTokens,
    modules: stage4.rewritten.modules,
    narrative: attempt.transcription.narrative,
    assetMirrorSummary: stage4.summary,
    fellBackToHero: attempt.fellBackToHero,
  });
};

/**
 * Companion handler the FE invokes when the operator clicks Confirm on the
 * ConvertConfirmation card. Records consent in the chat-metadata store and
 * optionally registers a robots.txt override for the origin (per AC14).
 */
export const confirmConvertHandler: ActionHandler = async (input, ctx) => {
  const url = typeof input.url === "string" ? input.url : null;
  if (!url) return fail("'url' required");
  if (!ctx.session.session_id) return fail("session_id required");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return fail(`'url' is not a valid URL: ${url}`);
  }
  const ownsSite = input.ownsSite === true;
  markConvertConfirmed({
    sessionId: ctx.session.session_id,
    accountId: ctx.session.account_id,
    url,
    ownsSite,
  });
  return ok({
    confirmed: true,
    url,
    origin: parsed.origin,
    ownsSite,
  });
};

function fail(error: string): ActionResult {
  return { status: "failed", error };
}

function ok(payload: Record<string, unknown>): ActionResult {
  return { status: "ok", payload };
}
