import {
  applyTokenPatch,
  buildTranscriptionDigest,
  classifyCapturedMarkdown,
  collectReferencedAssetUrls,
  deriveThemeTokens,
  htmlToMarkdown,
  mergeComputedSignals,
  mirrorAssetBatchToR2,
  renderedFetch,
  rewriteMarkdownImageRefs,
  titleFromDigest,
  uploadScreenshots,
  type DriverResult,
  type MirrorAssetResult,
  type PageCopyResult,
  type ReferenceDigest,
  type ScreenshotKeys,
} from "@gendev/extractor";
import { buildEmptyScaffold } from "@gendev/builder-ui";
import {
  chargeBrowserBudget,
  checkBrowserBudget,
  safeFetch,
} from "@gendev/web-fetch-safety";
import { resolveDriverFactory } from "./browser-driver.js";
import type { ActionContext, ActionHandler, ActionResult } from "./registry.js";

export interface TranscribeSiteEnv {
  readonly FETCH_CACHE_KV?: KVNamespace;
  readonly FETCH_ROBOTS_KV?: KVNamespace;
  readonly FETCH_RATE_KV?: KVNamespace;
  readonly BROWSER_BUDGET_KV?: KVNamespace;
  readonly ASSETS_BUCKET?: R2Bucket;
  readonly BROWSER?: unknown;
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
 * return their CacheLookup pairs (digest + KV key). Cross-origin links and
 * unanalyzed pages are silently skipped — the AI can call analyze_page for
 * them and re-invoke if it wants them included. The KV key is returned so
 * the REQ-49 rendered upgrade step can write back to the same cache slot.
 */
async function discoverAdditionalPageDigests(
  env: TranscribeSiteEnv,
  home: ReferenceDigest,
): Promise<ReadonlyArray<CacheLookup>> {
  const out: CacheLookup[] = [];
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
    out.push(lookup);
  }
  return out;
}

export const transcribeSiteHandler: ActionHandler = async (input, ctx) => {
  const env = ctx.env as TranscribeSiteEnv;
  const digestId = input.digestId;
  if (typeof digestId !== "string" || digestId.length === 0) {
    return fail("'digestId' must be a non-empty string (URL the digest was built for)");
  }

  const lookup = await loadDigest(env, digestId);
  if (!lookup) {
    return fail(
      `digest_not_found: no digest record for ${digestId} — run analyze_page first`,
    );
  }
  let homeDigest = lookup.digest;
  const accountId = ctx.session.account_id;

  // ── REQ-49: upgrade static-only digests via the rendered path ──────────
  // The original transcribe_site path silently accepted whatever fetchPath
  // analyze_page produced. When escalation decided "sufficient" (typical
  // for pages with enough static text to clear the thin-body gate), the
  // cached digest carries no screenshot, no computed styles, and no
  // background-image asset records — and the resulting transcription has
  // nothing for the AI to visually anchor on. Force the rendered path now,
  // re-merge signals, re-persist the digest to KV so subsequent reads see
  // the upgrade.
  const upgradedHome = await maybeUpgradeStaticDigest({
    env,
    ctx,
    digest: homeDigest,
    digestKey: lookup.digestKey,
    stageLabel: "home",
  });
  if (upgradedHome) {
    homeDigest = upgradedHome;
  }

  // ── Stage 0: clear the operator's draft to a fresh empty scaffold ───────
  // REQ-34: every convert lands on an empty 1-page scaffold so the AI's
  // reconstruction is not contaminated by the previous draft (1stcontact
  // starter modules, or stale content from a prior convert).
  // REQ-37: also evict any stale digest from a prior convert so
  // read_transcription_digest reports `not_ready` while the new convert is
  // mid-flight rather than handing back yesterday's data.
  const digestKey = `sites/${accountId}/transcription/digest.json`;
  if (env.ASSETS_BUCKET) {
    await env.ASSETS_BUCKET.delete(digestKey);
  }
  const sourceTitle = titleFromDigest(homeDigest);
  const clearedSiteDefinition = buildEmptyScaffold({ businessName: sourceTitle });
  ctx.emit({
    event: "action:notify",
    data: {
      tool: "transcribe_site",
      stage: 0,
      status: "cleared",
      businessName: clearedSiteDefinition.config.businessName,
    },
  });

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

  // Discover same-origin nav-linked pages that are already cached, then
  // upgrade any that are still static-only. Best-effort: if a per-page
  // upgrade fails (timeout / budget exhausted), we keep the static digest
  // so the page still appears in perPagePlan — just without a screenshot.
  const additionalLookups = await discoverAdditionalPageDigests(env, homeDigest);
  const additionalDigests: ReferenceDigest[] = [];
  for (const lookup of additionalLookups) {
    const upgraded = await maybeUpgradeStaticDigest({
      env,
      ctx,
      digest: lookup.digest,
      digestKey: lookup.digestKey,
      stageLabel: "additional",
    });
    additionalDigests.push(upgraded ?? lookup.digest);
  }
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
  if (!env.ASSETS_BUCKET) {
    return fail("ASSETS_BUCKET binding required to write transcription digest");
  }
  await env.ASSETS_BUCKET.put(digestKey, JSON.stringify(digest), {
    httpMetadata: { contentType: "application/json" },
  });
  // REQ-37: read the freshly-written digest back and confirm the capturedAt
  // sentinel matches what we put. Catches eventual-consistency drift, a racing
  // writer beating us to the same key, or a put that silently dropped.
  const verification = await env.ASSETS_BUCKET.get(digestKey);
  if (!verification) {
    return fail(`digest_write_unverified: ${digestKey} not retrievable after put`);
  }
  let roundTripped: Record<string, unknown>;
  try {
    roundTripped = (await verification.json()) as Record<string, unknown>;
  } catch (err) {
    return fail(`digest_write_unverified: round-tripped JSON did not parse: ${String(err)}`);
  }
  if (roundTripped.capturedAt !== capturedAt) {
    return fail(
      `digest_write_unverified: capturedAt drift at ${digestKey} (expected ${capturedAt}, got ${String(roundTripped.capturedAt)})`,
    );
  }

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
    clearedSiteDefinition,
    summary: {
      pageCount: digest.perPagePlan.length,
      assetCount: digest.assetInventory.length,
      mirrored: mirrorSummary.mirrored,
      mirrorFailures: mirrorSummary.failed,
      assetFailures: mirrorSummary.failures,
    },
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

/**
 * REQ-49 — when a cached ReferenceDigest has fetchPath: "static", drive the
 * rendered fetch path, merge computed signals, upload screenshots, and
 * persist the upgraded digest back to the cache. Returns the upgraded digest
 * on success, or `null` to fall through to the cached static digest (no
 * BROWSER binding, budget exhausted, driver failure, or the digest is
 * already rendered).
 *
 * The upgrade is best-effort by design: any failure logs a stage notify
 * event and returns null so transcribe_site still produces a TranscriptionDigest
 * with whatever signals the static fetch captured.
 */
async function maybeUpgradeStaticDigest(args: {
  env: TranscribeSiteEnv;
  ctx: ActionContext;
  digest: ReferenceDigest;
  digestKey: string;
  stageLabel: string;
}): Promise<ReferenceDigest | null> {
  const { env, ctx, digest, digestKey, stageLabel } = args;
  if (digest.fetchPath === "rendered") return null;
  if (!env.BROWSER) {
    ctx.emit({
      event: "action:notify",
      data: {
        tool: "transcribe_site",
        stage: 1,
        status: "render_upgrade_skipped",
        page: stageLabel,
        url: digest.sourceUrl,
        reason: "browser_binding_missing",
      },
    });
    return null;
  }
  if (!env.FETCH_CACHE_KV) {
    return null;
  }

  if (env.BROWSER_BUDGET_KV) {
    const probe = await checkBrowserBudget(
      { BROWSER_BUDGET_KV: env.BROWSER_BUDGET_KV },
      {
        accountId: ctx.session.account_id,
        sessionId: ctx.session.session_id ?? ctx.session.account_id,
      },
    );
    if (!probe.ok) {
      ctx.emit({
        event: "action:notify",
        data: {
          tool: "transcribe_site",
          stage: 1,
          status: "render_upgrade_skipped",
          page: stageLabel,
          url: digest.sourceUrl,
          reason: `browser_budget_exhausted:${probe.exhausted}`,
        },
      });
      return null;
    }
  }

  ctx.emit({
    event: "action:notify",
    data: {
      tool: "transcribe_site",
      stage: 1,
      status: "render_upgrade_started",
      page: stageLabel,
      url: digest.sourceUrl,
    },
  });

  let driverResult: DriverResult;
  try {
    const driver = resolveDriverFactory()(env.BROWSER);
    driverResult = await renderedFetch({ driver, url: digest.sourceUrl });
  } catch (err) {
    ctx.emit({
      event: "action:notify",
      data: {
        tool: "transcribe_site",
        stage: 1,
        status: "render_upgrade_failed",
        page: stageLabel,
        url: digest.sourceUrl,
        reason: String(err),
      },
    });
    return null;
  }

  if (env.BROWSER_BUDGET_KV && driverResult.durationSeconds > 0) {
    await chargeBrowserBudget(
      { BROWSER_BUDGET_KV: env.BROWSER_BUDGET_KV },
      {
        accountId: ctx.session.account_id,
        sessionId: ctx.session.session_id ?? ctx.session.account_id,
        costSeconds: driverResult.durationSeconds,
      },
    );
  }

  let screenshotKeys: ScreenshotKeys = { ...digest.screenshotKeys };
  if (env.ASSETS_BUCKET) {
    const turnId = await shortHash(`${digest.sourceUrl}|transcribe_upgrade`);
    const upload = await uploadScreenshots(
      env.ASSETS_BUCKET,
      driverResult.screenshots,
      {
        chatId: ctx.session.session_id ?? ctx.session.account_id ?? "session",
        turnId,
      },
    );
    screenshotKeys = { ...screenshotKeys, ...upload.keys };
  }

  const mergedSignals = mergeComputedSignals(
    digest.signals,
    driverResult.computedStyles,
    driverResult.computedBackgroundAssets,
    digest.sourceUrl,
    {
      fontAssets: driverResult.computedFontAssets,
      boundingBoxes: driverResult.boundingBoxes,
    },
  );

  const upgraded: ReferenceDigest = {
    ...digest,
    fetchPath: "rendered",
    signals: mergedSignals,
    screenshotKeys,
  };

  await env.FETCH_CACHE_KV.put(digestKey, JSON.stringify(upgraded));

  ctx.emit({
    event: "action:notify",
    data: {
      tool: "transcribe_site",
      stage: 1,
      status: "render_upgrade_completed",
      page: stageLabel,
      url: digest.sourceUrl,
      desktopScreenshot: screenshotKeys.desktop ?? null,
      durationSeconds: driverResult.durationSeconds,
    },
  });

  return upgraded;
}

async function shortHash(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex.slice(0, 16);
}
