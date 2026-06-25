/**
 * REQ-51 — `preview_generated_page` operator action.
 *
 * Closes the AI's perception loop: renders the operator's current draft page
 * server-side, navigates the Browser Rendering binding to it, captures
 * screenshots + computed styles, and (when a `compareToDigestId` is supplied)
 * runs a multimodal Haiku call that compares the preview against a cached
 * reference digest and produces a textual delta.
 *
 * Reuses REQ-22's rendered pipeline end-to-end (renderedFetch + the
 * mergeComputedSignals path), with a distinct R2 prefix (`previews/...`) so
 * chat-deletion sweeps can scope cleanly. No new Browser Rendering wiring.
 */

import {
  buildPreviewPrefix,
  deriveWhatsMissing,
  extractSignals,
  parseReferenceDigest,
  renderDigestMarkdown,
  renderPreviewDigest,
  SCHEMA_VERSION,
  type PreviewDigest,
  type ReferenceDigest,
  type Signals,
} from "@gendev/extractor";
import { renderSiteToHtml } from "@gendev/framework/render";
import type { Site } from "@gendev/site-schema";
import {
  chargeBrowserBudget,
  checkBrowserBudget,
} from "@gendev/web-fetch-safety";
import { resolveDriverFactory } from "./browser-driver.js";
import type { ActionContext, ActionHandler, ActionResult } from "./registry.js";

const HAIKU_MODEL = "claude-haiku-4-5-20251001";

interface PreviewEnv {
  readonly ASSETS_BUCKET?: R2Bucket;
  readonly BROWSER?: unknown;
  readonly BROWSER_BUDGET_KV?: KVNamespace;
  readonly FETCH_CACHE_KV?: KVNamespace;
  readonly CLAUDE_API_KEY?: string;
  readonly ANTHROPIC_API_URL?: string;
}

export const previewGeneratedPageHandler: ActionHandler = async (input, ctx) => {
  const env = ctx.env as PreviewEnv;

  if (!ctx.siteDefinition || typeof ctx.siteDefinition !== "object") {
    return fail(
      "preview_generated_page requires the chat-handler-provided siteDefinition; the direct /api/operator route is not supported for this action",
    );
  }
  const site = ctx.siteDefinition as Site;
  if (!Array.isArray(site.pages) || site.pages.length === 0) {
    return fail("draft has no pages to preview");
  }

  const pageId = resolvePageId(input.pageId, site);
  if (!pageId.ok) return fail(pageId.error);

  if (!env.ASSETS_BUCKET) {
    return fail(
      "preview_generated_page requires ASSETS_BUCKET binding (used for screenshot persistence)",
    );
  }

  const html = renderSiteToHtml(site, { target: "preview", pageId: pageId.value });
  const draftId = await shortHash(html);

  // Pass the rendered HTML to puppeteer via a data: URL rather than asking it
  // to fetch from `{requestOrigin}/assets/...`. Cloudflare's Browser Rendering
  // runs in the CF cloud and CANNOT reach the operator's localhost during
  // `wrangler dev`; in production it could, but routing through R2 + the
  // assets route would add a network round-trip when we already have the
  // bytes in memory. `sourceUrl` becomes a synthetic identifier so the chat
  // card and any downstream consumer have a stable, human-readable handle.
  const previewUrl = `preview://${ctx.session.account_id}/${draftId}/${pageId.value}`;
  // A data URL has no origin, so `/assets/<key>` refs inside the rendered
  // HTML cannot be resolved by the headless browser. Inline R2-backed assets
  // as data: URLs so hero bg-image, services-grid item images, and logos
  // render in the screenshot instead of 404'ing silently. (BUG-15.)
  const htmlForBrowser = await inlineLocalAssetsForPreview(html, env.ASSETS_BUCKET);
  const navigationUrl = htmlToDataUrl(htmlForBrowser);

  const capturedAt = new Date().toISOString();
  const previewSource = {
    accountId: ctx.session.account_id,
    draftId,
    pageId: pageId.value,
    capturedAt,
  } as const;

  const budgetGate = await gateBrowserBudget(env, ctx);
  if (!budgetGate.ok) {
    // Degraded path — BROWSER missing OR budget exhausted. We still have the
    // rendered HTML in memory, so extract structural signals (headings,
    // content tree, asset inventory) from it directly. This gives the
    // operator a useful preview card even when visual capture is unavailable.
    return ok(
      buildDegradedPayload({
        html,
        previewUrl,
        previewSource,
        note: budgetGate.note,
      }),
    );
  }

  let renderResult;
  try {
    const driver = resolveDriverFactory()(env.BROWSER);
    renderResult = await renderPreviewDigest({
      driver,
      navigationUrl,
      sourceUrl: previewUrl,
      previewSource,
      bucket: env.ASSETS_BUCKET,
    });
  } catch (err) {
    return fail(
      `preview render failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (env.BROWSER_BUDGET_KV && renderResult.driverResult.durationSeconds > 0) {
    await chargeBrowserBudget(
      { BROWSER_BUDGET_KV: env.BROWSER_BUDGET_KV },
      {
        accountId: ctx.session.account_id,
        sessionId: ctx.session.session_id ?? ctx.session.account_id,
        costSeconds: renderResult.driverResult.durationSeconds,
      },
    );
  }

  const compareToDigestId =
    typeof input.compareToDigestId === "string" ? input.compareToDigestId : null;

  let reference: ReferenceDigest | null = null;
  if (compareToDigestId) {
    reference = await loadReferenceDigest(env, compareToDigestId);
  }

  let inspirationDelta: string | undefined;
  let commentary: CommentaryResult;
  try {
    commentary = await runPreviewCommentary(env, {
      previewDigest: renderResult.digest,
      previewScreenshotBytes: await loadScreenshotBytes(
        env.ASSETS_BUCKET,
        renderResult.digest.screenshotKeys.desktop,
      ),
      reference,
      referenceScreenshotBytes: reference
        ? await loadScreenshotBytes(
            env.ASSETS_BUCKET,
            reference.screenshotKeys.desktop,
          )
        : null,
    });
  } catch {
    commentary = fallbackCommentary(renderResult.digest);
  }

  inspirationDelta = commentary.inspirationDelta;

  const finalWhatsMissing = [...renderResult.digest.commentary.whatsMissing];
  if (compareToDigestId && !reference) {
    finalWhatsMissing.push(
      `Could not resolve compareToDigestId='${compareToDigestId}' — no cached reference digest found; inspirationDelta omitted.`,
    );
  }

  const digest: PreviewDigest = {
    ...renderResult.digest,
    summary: commentary.summary,
    commentary: {
      perSection: commentary.perSection,
      whatsMissing: finalWhatsMissing,
    },
  };

  const payload: Record<string, unknown> = {
    kind: "preview_digest",
    digest,
    digestMarkdown: renderDigestMarkdown(digest),
  };
  if (inspirationDelta !== undefined) {
    payload.inspirationDelta = inspirationDelta;
  }
  return ok(payload);
};

interface PageIdOk {
  readonly ok: true;
  readonly value: string;
}
interface PageIdErr {
  readonly ok: false;
  readonly error: string;
}

function resolvePageId(raw: unknown, site: Site): PageIdOk | PageIdErr {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: site.pages[0]!.id };
  }
  if (typeof raw !== "string") {
    return { ok: false, error: "pageId must be a string" };
  }
  const match = site.pages.find((p) => p.id === raw);
  if (!match) {
    const known = site.pages.map((p) => p.id).join(", ");
    return {
      ok: false,
      error: `pageId '${raw}' not found in draft pages [${known}]`,
    };
  }
  return { ok: true, value: match.id };
}

/**
 * Build a `data:text/html;base64,...` URL that Cloudflare's Browser Rendering
 * binding can navigate to without making any outbound network request. This
 * sidesteps the local-dev problem where the CF browser (running in the cloud)
 * cannot resolve the operator's localhost, and the production case where
 * routing through R2 + the assets route would add an unnecessary round-trip
 * when we already have the bytes in memory.
 */
function htmlToDataUrl(html: string): string {
  return `data:text/html;charset=utf-8;base64,${base64FromBytes(new TextEncoder().encode(html))}`;
}

/**
 * Rewrite `/assets/<key>` references in the rendered HTML to inline
 * `data:<contentType>;base64,<bytes>` URLs by fetching each unique key from
 * R2. A data URL has no origin, so otherwise relative `/assets/...` refs
 * resolve to nothing inside the headless browser and screenshots come back
 * without their hero / services / logo imagery. (BUG-15.)
 *
 * Matches two reference shapes: `src="/assets/<key>"` (img tags) and CSS
 * `url(/assets/<key>)` (style attributes, inline <style>). Each key is
 * fetched once and cached. Keys that don't resolve in R2 preserve the
 * original src — the operator can still see something is wrong; we don't
 * silently destroy the page.
 */
async function inlineLocalAssetsForPreview(
  html: string,
  bucket: R2Bucket,
): Promise<string> {
  const ATTR_RE = /(\bsrc\s*=\s*")\/assets\/([^"]+)(")/g;
  const URL_RE = /(\burl\(\s*['"]?)\/assets\/([^'")\s]+)(['"]?\s*\))/g;

  const keys = new Set<string>();
  for (const m of html.matchAll(ATTR_RE)) keys.add(safeDecode(m[2]));
  for (const m of html.matchAll(URL_RE)) keys.add(safeDecode(m[2]));
  if (keys.size === 0) return html;

  const replacements = new Map<string, string>();
  await Promise.all(
    [...keys].map(async (key) => {
      try {
        const obj = await bucket.get(key);
        if (!obj) return;
        const ct = obj.httpMetadata?.contentType ?? "application/octet-stream";
        const ab = await obj.arrayBuffer();
        replacements.set(
          key,
          `data:${ct};base64,${base64FromBytes(new Uint8Array(ab))}`,
        );
      } catch {
        // Swallow per-asset errors so one missing/broken object doesn't break
        // the whole preview; original src is preserved.
      }
    }),
  );
  if (replacements.size === 0) return html;

  const rewriteAttr = (
    full: string,
    prefix: string,
    encodedKey: string,
    suffix: string,
  ): string => {
    const data = replacements.get(safeDecode(encodedKey));
    return data ? `${prefix}${data}${suffix}` : full;
  };

  return html
    .replace(ATTR_RE, rewriteAttr)
    .replace(URL_RE, rewriteAttr);
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

type BudgetGate =
  | { readonly ok: true }
  | { readonly ok: false; readonly note: string };

async function gateBrowserBudget(
  env: PreviewEnv,
  ctx: ActionContext,
): Promise<BudgetGate> {
  if (!env.BROWSER) {
    return {
      ok: false,
      note: "Visual signals unavailable — BROWSER binding not configured for this environment.",
    };
  }
  if (!env.BROWSER_BUDGET_KV) return { ok: true };
  const probe = await checkBrowserBudget(
    { BROWSER_BUDGET_KV: env.BROWSER_BUDGET_KV },
    {
      accountId: ctx.session.account_id,
      sessionId: ctx.session.session_id ?? ctx.session.account_id,
    },
  );
  if (probe.ok) return { ok: true };
  return {
    ok: false,
    note: `Visual signals unavailable — Browser Rendering budget exhausted (${probe.exhausted}) for this session.`,
  };
}

/**
 * Build a `preview_digest` payload for the BROWSER-unavailable / budget-exhausted
 * path. Visual signals (screenshots + computed typography weights + palette
 * background colours) are missing, but `extractSignals(html, url)` runs over
 * the in-memory rendered HTML and gives the operator the structural picture
 * the static-layer extractors can produce — headings, nav links, asset
 * inventory, content/section counts.
 *
 * `fetchPath` is `'static'` so consumers can tell at a glance this is a
 * degraded digest. The supplied `note` (e.g. "BROWSER binding not configured…")
 * lands at the top of `whatsMissing` so the operator sees WHY they aren't
 * looking at screenshots.
 */
function buildDegradedPayload(args: {
  html: string;
  previewUrl: string;
  previewSource: { accountId: string; draftId: string; pageId: string; capturedAt: string };
  note: string;
}): Record<string, unknown> {
  const signals: Signals = extractSignals(args.html, args.previewUrl);
  const summary = buildDegradedSummary(signals, args.previewSource.pageId);
  const digest: PreviewDigest = {
    schemaVersion: SCHEMA_VERSION,
    sourceUrl: args.previewUrl,
    fetchedAt: args.previewSource.capturedAt,
    fetchPath: "static",
    summary,
    signals,
    commentary: {
      perSection: {},
      whatsMissing: [args.note, ...deriveWhatsMissing(signals)],
    },
    screenshotKeys: {},
    previewSource: args.previewSource,
  };
  return {
    kind: "preview_digest",
    digest,
    digestMarkdown: renderDigestMarkdown(digest),
  };
}

function buildDegradedSummary(signals: Signals, pageId: string): string {
  return (
    `Preview of draft page '${pageId}' (visual capture unavailable; structural signals only): ` +
    `${signals.content.headings.length} headings, ` +
    `${signals.content.sectionCount} sections, ` +
    `${signals.assetInventory.length} assets.`
  );
}

async function loadReferenceDigest(
  env: PreviewEnv,
  digestId: string,
): Promise<ReferenceDigest | null> {
  if (!env.FETCH_CACHE_KV) return null;
  const cacheKey = await referenceCacheKey(digestId);
  const cached = await env.FETCH_CACHE_KV.get(cacheKey, "json");
  if (!cached) return null;
  try {
    return parseReferenceDigest(cached);
  } catch {
    return null;
  }
}

async function loadScreenshotBytes(
  bucket: R2Bucket | undefined,
  key: string | undefined,
): Promise<Uint8Array | null> {
  if (!bucket || !key) return null;
  try {
    const obj = await bucket.get(key);
    if (!obj) return null;
    const ab = await obj.arrayBuffer();
    return new Uint8Array(ab);
  } catch {
    return null;
  }
}

interface CommentaryResult {
  readonly summary: string;
  readonly perSection: Record<string, string>;
  readonly inspirationDelta?: string;
}

function fallbackCommentary(digest: PreviewDigest): CommentaryResult {
  return {
    summary: `Preview of draft page '${digest.previewSource.pageId}' (account ${digest.previewSource.accountId}) — ${digest.signals.content.headings.length} headings, ${digest.signals.imagery.imgCount} images, ${digest.signals.imagery.backgroundCount} backgrounds.`,
    perSection: {},
  };
}

async function runPreviewCommentary(
  env: PreviewEnv,
  args: {
    previewDigest: PreviewDigest;
    previewScreenshotBytes: Uint8Array | null;
    reference: ReferenceDigest | null;
    referenceScreenshotBytes: Uint8Array | null;
  },
): Promise<CommentaryResult> {
  if (!env.CLAUDE_API_KEY) return fallbackCommentary(args.previewDigest);
  const url = env.ANTHROPIC_API_URL ?? "https://api.anthropic.com/v1/messages";

  const userContent: unknown[] = [];
  if (args.previewScreenshotBytes) {
    userContent.push(imageBlock(args.previewScreenshotBytes));
  }
  if (args.referenceScreenshotBytes) {
    userContent.push(imageBlock(args.referenceScreenshotBytes));
  }
  userContent.push({
    type: "text",
    text: buildPreviewCommentaryPrompt({
      previewDigest: args.previewDigest,
      reference: args.reference,
      hasPreviewImage: args.previewScreenshotBytes !== null,
      hasReferenceImage: args.referenceScreenshotBytes !== null,
    }),
  });

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
      system: buildPreviewCommentarySystemPrompt({
        hasReference: args.reference !== null,
        hasPreviewImage: args.previewScreenshotBytes !== null,
        hasReferenceImage: args.referenceScreenshotBytes !== null,
      }),
      messages: [{ role: "user", content: userContent }],
    }),
  });
  if (!resp.ok) return fallbackCommentary(args.previewDigest);
  const json = (await resp.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = json.content?.find((b) => b.type === "text")?.text ?? "";
  const parsed = tryParseJson(text);
  if (!parsed) return fallbackCommentary(args.previewDigest);

  const summary =
    typeof parsed.summary === "string" && parsed.summary.length > 0
      ? parsed.summary
      : fallbackCommentary(args.previewDigest).summary;
  const perSection = isStringRecord(parsed.perSection) ? parsed.perSection : {};
  const inspirationDelta =
    args.reference !== null && typeof parsed.inspirationDelta === "string" &&
    parsed.inspirationDelta.length > 0
      ? parsed.inspirationDelta
      : undefined;
  return { summary, perSection, inspirationDelta };
}

function buildPreviewCommentarySystemPrompt(args: {
  hasReference: boolean;
  hasPreviewImage: boolean;
  hasReferenceImage: boolean;
}): string {
  const base =
    'You are the 1st Contact AI self-inspection commentator. Reply with a SINGLE JSON object only — no preamble, no markdown fences. Schema: { "summary": string, "perSection": { [section: string]: string }, "inspirationDelta"?: string }. Sections are: palette, typography, layout, imagery, content, assetInventory. Keep each perSection commentary under 200 characters. summary is one sentence (≤ 240 chars).';
  if (args.hasReference) {
    return (
      base +
      ' The first image is the AI\'s OWN generated page (preview). The second image is the inspiration source (reference). Set inspirationDelta to 2–4 sentences enumerating concrete visual deltas between the two — alignment (left vs centered), density (denser, sparser), hero treatment, typography weight, palette warmth. You MUST include at least one of these comparison words verbatim: aligned, centered, left, denser, sparser, lighter, heavier, warmer, cooler, tighter, looser.'
    );
  }
  if (args.hasPreviewImage) {
    return (
      base +
      ' You are given a desktop screenshot of the AI\'s own generated page. Use it: comment on visual properties (alignment, density, hero treatment, layout rhythm). summary MUST describe what the rendered page looks like.'
    );
  }
  return (
    base +
    ' No screenshots were available. Base your summary and per-section commentary on the structured signals alone.'
  );
}

function buildPreviewCommentaryPrompt(args: {
  previewDigest: PreviewDigest;
  reference: ReferenceDigest | null;
  hasPreviewImage: boolean;
  hasReferenceImage: boolean;
}): string {
  const lines: string[] = [];
  lines.push("Preview signals (the AI's own generated draft page):");
  lines.push("```json");
  lines.push(JSON.stringify(args.previewDigest.signals, null, 2));
  lines.push("```");
  if (args.reference) {
    lines.push("");
    lines.push("Reference signals (the inspiration source being compared against):");
    lines.push("```json");
    lines.push(JSON.stringify(args.reference.signals, null, 2));
    lines.push("```");
  }
  lines.push("");
  if (args.reference) {
    lines.push(
      "Compare the preview to the reference. Produce the JSON commentary object. summary describes what the preview looks like in one sentence. perSection gives 1–2 sentence commentary per signal category. inspirationDelta is 2–4 sentences listing concrete visual deltas; include at least one explicit comparison word.",
    );
  } else {
    lines.push(
      "Produce the JSON commentary object. summary describes what the preview looks like in one sentence. perSection gives 1–2 sentence commentary per signal category. inspirationDelta should be omitted (no reference loaded).",
    );
  }
  return lines.join("\n");
}

function imageBlock(bytes: Uint8Array): unknown {
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: "image/png",
      data: base64FromBytes(bytes),
    },
  };
}

async function referenceCacheKey(digestId: string): Promise<string> {
  // Mirrors analyze-page.ts:digestCacheKey shape (`digest:{sha256(url|schemaVersion)}`).
  const data = new TextEncoder().encode(`${digestId}|${SCHEMA_VERSION}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return `digest:${hexOf(hash)}`;
}

async function shortHash(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return hexOf(hash).slice(0, 16);
}

function hexOf(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
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

function base64FromBytes(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fail(error: string): ActionResult {
  return { status: "failed", error };
}

function ok(payload: Record<string, unknown>): ActionResult {
  return { status: "ok", payload };
}

/**
 * Re-export so the renderer in builder-ui (and the handler's tests) can use
 * the same buildPreviewPrefix helper without re-importing from extractor.
 */
export { buildPreviewPrefix };
