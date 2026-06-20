import {
  applyTokenPatch,
  buildTranscriptionDigest,
  classifyCapturedMarkdown,
  collectReferencedAssetUrls,
  deriveThemeTokens,
  htmlToMarkdown,
  mirrorAssetBatchToR2,
  rewriteMarkdownImageRefs,
  type MirrorAssetResult,
  type PageCopyResult,
  type ReferenceDigest,
} from "@1stcontact/extractor";
import { safeFetch } from "@1stcontact/web-fetch-safety";
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

  // ── Stage 5: capture body markdown per page → R2 (REQ-33) ───────────────
  // Convert each cached page's source HTML to markdown, rewrite image refs to
  // R2 keys, and write small inline blocks vs. larger files. The digest gains
  // `copy` (AssetRef text) or `inlineMarkdown` per page so the AI passes them
  // verbatim into set_module_content for any markdown body field.
  const pageCopyByUrl = await captureBodyMarkdown({
    env,
    siteId: accountId,
    pageDigests,
    urlToR2Key,
    onEvent: (data) => ctx.emit({ event: "action:notify", data }),
  });

  // ── Stage 3: build and write the TranscriptionDigest ────────────────────
  const capturedAt = new Date().toISOString();
  const digest = buildTranscriptionDigest({
    siteId: accountId,
    homeDigest,
    additionalPageDigests: additionalDigests,
    urlToR2Key,
    mirrorSummary,
    capturedAt,
    pageCopyByUrl,
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

/**
 * REQ-33 — Stage 5: walk each cached page digest, re-fetch the source HTML
 * (via safeFetch — typically a cache HIT since analyze_page populated the
 * cache), convert to markdown, rewrite any embedded image URLs to their R2
 * keys from the mirror result, and either inline (short single-paragraph
 * blocks) or write to R2 (everything else). Returns a per-page map the
 * digest builder uses to populate `copy` / `inlineMarkdown` fields on
 * `perPagePlan` entries.
 *
 * Source HTML re-fetch is best-effort — if a page can't be fetched we skip
 * it. The previously-captured digest signals (headings, palette, etc.) are
 * preserved; only the body copy attachment is missing.
 */
async function captureBodyMarkdown(args: {
  env: TranscribeSiteEnv;
  siteId: string;
  pageDigests: ReadonlyArray<ReferenceDigest>;
  urlToR2Key: ReadonlyMap<string, string>;
  onEvent: (data: Record<string, unknown>) => void;
}): Promise<Map<string, PageCopyResult>> {
  const out = new Map<string, PageCopyResult>();
  const env = args.env;
  if (!env.FETCH_CACHE_KV || !env.FETCH_ROBOTS_KV || !env.ASSETS_BUCKET) {
    return out;
  }
  args.onEvent({
    tool: "transcribe_site",
    stage: 5,
    status: "started",
    total: args.pageDigests.length,
  });
  let written = 0;
  let inlined = 0;
  for (const digest of args.pageDigests) {
    const slug = slugForCopyKey(digest.sourceUrl);
    try {
      const fetched = await safeFetch(
        digest.sourceUrl,
        { FETCH_CACHE_KV: env.FETCH_CACHE_KV, FETCH_ROBOTS_KV: env.FETCH_ROBOTS_KV },
        { headers: { "user-agent": "1stcontact-bot" } },
      );
      if (!fetched.ok) {
        args.onEvent({
          tool: "transcribe_site",
          stage: 5,
          status: "page_skipped",
          url: digest.sourceUrl,
          reason: fetched.reason,
        });
        continue;
      }
      const html = new TextDecoder("utf-8").decode(fetched.body);
      const bodyHtml = extractBodyHtml(html);
      const markdown = rewriteMarkdownImageRefs(
        htmlToMarkdown(bodyHtml),
        args.urlToR2Key,
      );
      const trimmed = markdown.trim();
      if (trimmed.length === 0) {
        args.onEvent({
          tool: "transcribe_site",
          stage: 5,
          status: "page_skipped",
          url: digest.sourceUrl,
          reason: "no_body_text",
        });
        continue;
      }
      if (classifyCapturedMarkdown(trimmed) === "inline") {
        out.set(digest.sourceUrl, { inlineMarkdown: trimmed });
        inlined++;
        args.onEvent({
          tool: "transcribe_site",
          stage: 5,
          status: "page_inlined",
          url: digest.sourceUrl,
          bytes: trimmed.length,
        });
        continue;
      }
      const key = `sites/${args.siteId}/copy/${slug}.md`;
      await env.ASSETS_BUCKET.put(key, trimmed, {
        httpMetadata: { contentType: "text/markdown" },
      });
      out.set(digest.sourceUrl, {
        copy: {
          kind: "text",
          id: key,
          src: `/assets/${key}`,
          alt: firstLine(trimmed),
        },
      });
      written++;
      args.onEvent({
        tool: "transcribe_site",
        stage: 5,
        status: "page_written",
        url: digest.sourceUrl,
        r2Key: key,
        bytes: trimmed.length,
      });
    } catch (err) {
      args.onEvent({
        tool: "transcribe_site",
        stage: 5,
        status: "page_failed",
        url: digest.sourceUrl,
        reason: String(err),
      });
    }
  }
  args.onEvent({
    tool: "transcribe_site",
    stage: 5,
    status: "completed",
    written,
    inlined,
  });
  return out;
}

/** Derive the per-page copy slug from a URL. Root → 'home', else last path segment. */
function slugForCopyKey(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, "");
    if (!path) return "home";
    const last = path.split("/").filter(Boolean).pop() ?? "home";
    const cleaned = last
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return cleaned || "home";
  } catch {
    return "home";
  }
}

/**
 * Extract the body HTML for markdown conversion. Strips head/script/style;
 * if a `<main>` element exists, prefers its inner HTML; else falls back to
 * the body. Keeps the input modest in size and avoids capturing nav/footer
 * boilerplate unless it's part of the main content.
 */
function extractBodyHtml(html: string): string {
  const stripped = html
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(stripped);
  if (main) return main[1];
  const body = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(stripped);
  if (body) return body[1];
  return stripped;
}

function firstLine(markdown: string): string {
  const line = markdown.split("\n").find((l) => l.trim().length > 0) ?? "";
  return line.trim().slice(0, 120);
}
