/**
 * REQ-51 — render a PreviewDigest from the AI's own draft page.
 *
 * Mirrors the rendered path of `analyze_page` ([[REQ-21]] / [[REQ-22]]) but
 * targets a builder-internal URL (the operator's draft, served via the
 * existing `/assets/...` route) instead of an external reference. Same
 * `renderedFetch` + `mergeComputedSignals` pipeline; same screenshot upload
 * shape; distinct R2 prefix so chat-deletion sweeps can scope cleanly.
 *
 * The function is pure plumbing: it takes a `BrowserDriver` (the caller
 * resolves the real `@cloudflare/puppeteer` binding or injects a fake) and
 * an `R2BucketLike`, and returns the `PreviewDigest`. The handler in
 * `apps/control-app/src/operator/preview-generated-page.ts` is responsible
 * for resolving the preview URL, charging the browser budget, fetching the
 * cached `ReferenceDigest` for comparison, and running the multimodal
 * commentary call.
 */

import { deriveWhatsMissing, extractSignals } from "./extract.js";
import { mergeComputedSignals } from "./merge.js";
import {
  renderedFetch,
  type BrowserDriver,
  type DriverResult,
} from "./rendered-fetch.js";
import {
  PreviewDigest,
  ReferenceDigest,
  SCHEMA_VERSION,
  type PreviewSource,
  type ScreenshotKeys,
} from "./schema.js";
import { uploadScreenshots, type R2BucketLike } from "./upload-screenshots.js";

export interface RenderPreviewDigestArgs {
  readonly driver: BrowserDriver;
  /** Absolute URL the browser navigates to — the rendered draft page. */
  readonly previewUrl: string;
  /** Provenance fields that distinguish a preview from a reference digest. */
  readonly previewSource: PreviewSource;
  /** R2 bucket for screenshot uploads. Optional — when absent screenshots are dropped. */
  readonly bucket?: R2BucketLike;
}

export interface RenderPreviewDigestResult {
  readonly digest: PreviewDigest;
  /** Driver output, surfaced so the handler can feed the desktop screenshot
   *  bytes into the multimodal commentary call without a second R2 read. */
  readonly driverResult: DriverResult;
  /** Notes appended to `commentary.whatsMissing` when screenshots couldn't
   *  be persisted (e.g. ASSETS_BUCKET absent, too-large drops). */
  readonly notes: readonly string[];
}

/**
 * Run the rendered-fetch pipeline against a builder-internal preview URL and
 * return a `PreviewDigest`. The returned digest has `fetchPath: 'rendered'`
 * and the `previewSource` field populated from the caller's args.
 *
 * Commentary is NOT generated here — that's the handler's job (it owns the
 * Anthropic call, the `compareToDigestId` lookup, and the inspiration-delta
 * prompt). This function returns a digest with empty commentary; the handler
 * overlays the AI commentary before returning.
 */
export async function renderPreviewDigest(
  args: RenderPreviewDigestArgs,
): Promise<RenderPreviewDigestResult> {
  const driverResult = await renderedFetch({
    driver: args.driver,
    url: args.previewUrl,
  });

  const baseSignals = extractSignals(driverResult.html, args.previewUrl);
  const signals = mergeComputedSignals(
    baseSignals,
    driverResult.computedStyles,
    driverResult.computedBackgroundAssets,
    args.previewUrl,
    {
      fontAssets: driverResult.computedFontAssets,
      boundingBoxes: driverResult.boundingBoxes,
    },
  );

  const notes: string[] = [];
  let screenshotKeys: ScreenshotKeys = {};
  if (args.bucket) {
    const pathPrefix = buildPreviewPrefix(args.previewSource);
    const upload = await uploadScreenshots(args.bucket, driverResult.screenshots, {
      pathPrefix,
    });
    screenshotKeys = { ...upload.keys };
    for (const drop of upload.dropped) {
      notes.push(
        `Screenshot for ${drop.viewport} dropped (screenshot_too_large: ${drop.bytes} bytes).`,
      );
    }
  } else {
    notes.push("Screenshots not persisted — ASSETS_BUCKET binding missing.");
  }

  const baselineWhatsMissing = deriveWhatsMissing(signals);

  const digest: PreviewDigest = {
    schemaVersion: SCHEMA_VERSION,
    sourceUrl: args.previewUrl,
    fetchedAt: args.previewSource.capturedAt,
    fetchPath: "rendered",
    summary: "",
    signals,
    commentary: {
      perSection: {},
      whatsMissing: [...baselineWhatsMissing, ...notes],
    },
    screenshotKeys,
    previewSource: args.previewSource,
  };

  return { digest, driverResult, notes };
}

/**
 * `previews/{accountId}/{draftId}/{pageId}` — distinct prefix family from
 * `references/*` so per-chat deletion sweeps can scope cleanly. URL-safe
 * segments only; callers are expected to pass identifiers that don't need
 * encoding (account ids, page slugs).
 */
export function buildPreviewPrefix(source: PreviewSource): string {
  return `previews/${source.accountId}/${source.draftId}/${source.pageId}`;
}

/**
 * Validate a payload claims to be a `PreviewDigest`. Thin wrapper around the
 * Zod schema so callers don't have to import zod themselves.
 */
export function parsePreviewDigest(value: unknown): PreviewDigest {
  return PreviewDigest.parse(value);
}

/**
 * Validate a payload claims to be a `ReferenceDigest`. Thin wrapper used by
 * the `preview_generated_page` handler when reading a cached digest from
 * `FETCH_CACHE_KV` for `compareToDigestId` comparison.
 */
export function parseReferenceDigest(value: unknown): ReferenceDigest {
  return ReferenceDigest.parse(value);
}
