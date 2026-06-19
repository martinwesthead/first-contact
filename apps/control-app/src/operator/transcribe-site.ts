import {
  applyTokenPatch,
  buildTranscriptionDigest,
  collectReferencedAssetUrls,
  deriveThemeTokens,
  mirrorAssetBatchToR2,
  type MirrorAssetResult,
  type ReferenceDigest,
} from "@1stcontact/extractor";
import type { ActionHandler, ActionResult } from "./registry.js";
import {
  isConvertConfirmed,
  markConvertConfirmed,
} from "./chat-metadata.js";

export interface TranscribeSiteEnv {
  readonly FETCH_CACHE_KV?: KVNamespace;
  readonly FETCH_ROBOTS_KV?: KVNamespace;
  readonly FETCH_RATE_KV?: KVNamespace;
  readonly ASSETS_BUCKET?: R2Bucket;
}

interface CacheLookup {
  readonly digestKey: string;
  readonly digest: ReferenceDigest;
}

const SCHEMA_VERSION_FOR_KEY = 1 as const;

async function loadDigest(
  env: TranscribeSiteEnv,
  url: string,
): Promise<CacheLookup | null> {
  if (!env.FETCH_CACHE_KV) return null;
  const data = new TextEncoder().encode(`${url}|${SCHEMA_VERSION_FOR_KEY}`);
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
 * Resolve any same-origin nav-link URLs that already have cached digests and
 * return their ReferenceDigests. Cross-origin links and unanalyzed pages are
 * silently skipped — the AI can call analyze_page for them and re-invoke if
 * it wants them included.
 */
async function discoverAdditionalPageDigests(
  env: TranscribeSiteEnv,
  home: ReferenceDigest,
): Promise<ReadonlyArray<ReferenceDigest>> {
  const out: ReferenceDigest[] = [];
  const seen = new Set<string>([home.sourceUrl]);
  let homeOrigin: string;
  try {
    homeOrigin = new URL(home.sourceUrl).origin;
  } catch {
    return out;
  }
  for (const link of home.signals.content.navLinks) {
    let resolved: URL;
    try {
      resolved = new URL(link.href, home.sourceUrl);
    } catch {
      continue;
    }
    if (resolved.origin !== homeOrigin) continue;
    const normalized = resolved.toString();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    const lookup = await loadDigest(env, normalized);
    if (!lookup) continue;
    out.push(lookup.digest);
  }
  return out;
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

  const lookup = await loadDigest(env, digestId);
  if (!lookup) {
    return fail(
      `digest_not_found: no digest record for ${digestId} — run analyze_page first`,
    );
  }
  const homeDigest = lookup.digest;

  const accountId = ctx.session.account_id;
  const confirmed = isConvertConfirmed({
    sessionId: ctx.session.session_id,
    accountId,
    url: homeDigest.sourceUrl,
  });

  if (!confirmed) {
    const confirmationPrompt = `Convert will replace your current draft with a transcription of ${homeDigest.sourceUrl}. This cannot be automatically undone. Continue?`;
    ctx.emit({
      event: "action:notify",
      data: {
        tool: "transcribe_site",
        kind: "convert_confirmation_required",
        url: homeDigest.sourceUrl,
        prompt: confirmationPrompt,
      },
    });
    return ok({
      kind: "convert_confirmation",
      url: homeDigest.sourceUrl,
      prompt: confirmationPrompt,
    });
  }

  // ── Stage 1: screenshot preview ─────────────────────────────────────────
  const screenshotUrl = homeDigest.screenshotKeys.desktop
    ? `/assets/${homeDigest.screenshotKeys.desktop}`
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
  const tokenPatch = deriveThemeTokens(homeDigest);
  ctx.emit({
    event: "action:notify",
    data: {
      tool: "transcribe_site",
      stage: 2,
      status: "completed",
      themeTokens: applyTokenPatch(tokenPatch),
      confidence: tokenPatch.confidence,
    },
  });

  // Discover same-origin nav-linked pages that are already cached.
  const additionalDigests = await discoverAdditionalPageDigests(env, homeDigest);
  const pageDigests = [homeDigest, ...additionalDigests];

  // ── Mirror referenced assets (inline; the digest carries r2Keys) ────────
  const urls = collectReferencedAssetUrls(pageDigests);
  let urlToR2Key = new Map<string, string>();
  let mirrorSummary = { mirrored: 0, failed: 0, failures: [] as Array<{ url: string; reason: string }> };
  if (urls.length > 0 && env.ASSETS_BUCKET && env.FETCH_CACHE_KV && env.FETCH_ROBOTS_KV) {
    ctx.emit({
      event: "action:notify",
      data: {
        tool: "transcribe_site",
        stage: 4,
        status: "started",
        total: urls.length,
      },
    });
    const batch = await mirrorAssetBatchToR2({
      urls,
      siteId: accountId,
      bucket: env.ASSETS_BUCKET,
      safetyEnv: {
        FETCH_CACHE_KV: env.FETCH_CACHE_KV,
        FETCH_ROBOTS_KV: env.FETCH_ROBOTS_KV,
      },
      onResult: (r: MirrorAssetResult) => {
        ctx.emit({
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
    urlToR2Key = new Map(batch.urlToR2Key);
    mirrorSummary = {
      mirrored: batch.successes.length,
      failed: batch.failures.length,
      failures: batch.failures.map((f) => ({ url: f.url, reason: f.reason })),
    };
  }

  // ── Stage 3: build and write the TranscriptionDigest ────────────────────
  const capturedAt = new Date().toISOString();
  const digest = buildTranscriptionDigest({
    siteId: accountId,
    homeDigest,
    additionalPageDigests: additionalDigests,
    urlToR2Key,
    mirrorSummary,
    capturedAt,
  });
  const digestKey = `sites/${accountId}/transcription/digest.json`;
  if (!env.ASSETS_BUCKET) {
    return fail("ASSETS_BUCKET binding required to write transcription digest");
  }
  await env.ASSETS_BUCKET.put(digestKey, JSON.stringify(digest), {
    httpMetadata: { contentType: "application/json" },
  });

  ctx.emit({
    event: "action:notify",
    data: {
      tool: "transcribe_site",
      stage: 3,
      status: "completed",
      digestKey,
      pageCount: digest.perPagePlan.length,
      assetCount: digest.assetInventory.length,
    },
  });

  return ok({
    kind: "transcribe_site_done",
    digestKey,
    summary: {
      pageCount: digest.perPagePlan.length,
      assetCount: digest.assetInventory.length,
      mirrored: mirrorSummary.mirrored,
      mirrorFailures: mirrorSummary.failed,
    },
  });
};

/**
 * Companion handler the FE invokes when the operator clicks Confirm on the
 * ConvertConfirmation card. Records consent in the chat-metadata store and
 * optionally registers a robots.txt override for the origin.
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
