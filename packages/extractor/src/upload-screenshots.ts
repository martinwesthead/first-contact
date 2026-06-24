import type { ViewportName } from "./rendered-fetch.js";

/**
 * 8 MB hard cap per viewport — REQ-22 §"Screenshot viewports". Anything
 * larger is dropped with a `screenshot_too_large` note instead of inflating
 * R2 / network costs.
 */
export const SCREENSHOT_BYTES_CAP = 8 * 1024 * 1024;

/**
 * Minimal R2 surface the upload function needs. Defining it locally keeps
 * the extractor free of @cloudflare/workers-types (matching the dom.ts
 * pattern). Production code passes through an actual `R2Bucket`; tests pass a
 * `makeMemR2()` instance.
 */
export interface R2BucketLike {
  put(
    key: string,
    body: Uint8Array,
    opts?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
}

/**
 * Args shape — either the legacy `references/{chatId}/{turnId}` prefix for
 * external `analyze_page` digests, OR an explicit `pathPrefix` for callers
 * that need a different prefix shape (REQ-51's `previews/{accountId}/{draftId}/{pageId}`).
 *
 * The explicit-prefix form is required so the chat-deletion sweep can scope
 * cleanly per prefix family (`references/*` vs `previews/*`) without sharing
 * a parent directory.
 */
export type UploadScreenshotsArgs =
  | { readonly chatId: string; readonly turnId: string }
  | { readonly pathPrefix: string };

export interface ScreenshotDrop {
  readonly viewport: ViewportName;
  readonly reason: "screenshot_too_large";
  readonly bytes: number;
}

export interface UploadResult {
  readonly keys: Partial<Record<ViewportName, string>>;
  readonly dropped: readonly ScreenshotDrop[];
}

/**
 * Upload PNG screenshots for each viewport to R2. Default prefix is
 * `references/{chatId}/{turnId}`; pass `{ pathPrefix }` to override
 * (REQ-51 uses `previews/{accountId}/{draftId}/{pageId}`). Returns the keys
 * (so the digest record can reference them) plus a list of any viewports
 * dropped due to the 8 MB cap.
 *
 * Skips viewports that the driver didn't produce (e.g. one timed out and
 * came back missing).
 */
export async function uploadScreenshots(
  bucket: R2BucketLike,
  screenshots: Partial<Record<ViewportName, Uint8Array>>,
  args: UploadScreenshotsArgs,
): Promise<UploadResult> {
  const keys: Partial<Record<ViewportName, string>> = {};
  const dropped: ScreenshotDrop[] = [];
  const viewports: ViewportName[] = ["mobile", "tablet", "desktop"];
  const prefix = resolvePrefix(args);

  for (const vp of viewports) {
    const bytes = screenshots[vp];
    if (!bytes || bytes.byteLength === 0) continue;
    if (bytes.byteLength > SCREENSHOT_BYTES_CAP) {
      dropped.push({ viewport: vp, reason: "screenshot_too_large", bytes: bytes.byteLength });
      continue;
    }
    const key = `${prefix}/${vp}.png`;
    await bucket.put(key, bytes, { httpMetadata: { contentType: "image/png" } });
    keys[vp] = key;
  }

  return { keys, dropped };
}

function resolvePrefix(args: UploadScreenshotsArgs): string {
  if ("pathPrefix" in args) {
    return args.pathPrefix.replace(/\/+$/, "");
  }
  return `references/${args.chatId}/${args.turnId}`;
}
