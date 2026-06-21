import { parseHtml, resolveUrl } from "./dom.js";
import { walkCssRules } from "./css-walk.js";
import type { AssetRecord, Signals } from "./schema.js";

export interface StylesheetFetchResult {
  readonly ok: boolean;
  readonly text?: string;
}

export type StylesheetFetcher = (url: string) => Promise<StylesheetFetchResult>;

const URL_FUNC = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;

/**
 * Find every `<link rel="stylesheet" href="...">` in the parsed HTML and
 * return the resolved absolute URLs in document order, deduped.
 */
export function collectExternalStylesheetUrls(
  html: string,
  baseUrl: string,
): string[] {
  const { document } = parseHtml(html);
  const links = document.querySelectorAll("link");
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < links.length; i++) {
    const el = links[i];
    const rel = (el.getAttribute("rel") ?? "").toLowerCase();
    if (!rel.split(/\s+/).includes("stylesheet")) continue;
    const href = el.getAttribute("href");
    if (!href) continue;
    const resolved = resolveUrl(href, baseUrl);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    out.push(resolved);
  }
  return out;
}

/**
 * Fetch every external `<link rel="stylesheet">` referenced by the HTML and
 * extract `background-image` / `background` url() values from the resulting
 * CSS. Returns AssetRecord entries with kind='background', resolved against
 * the stylesheet's own URL (per CSS spec — url() in a stylesheet is relative
 * to the stylesheet, not the document).
 *
 * Failed fetches are silently skipped: the caller already has whatever
 * inline + `<style>`-block backgrounds `parseImagery` surfaced, and stylesheet
 * fetch is best-effort enrichment.
 *
 * Known limitations:
 *   - `@import url(other.css)` chains are not followed.
 *   - `data:` URLs are filtered out (inline images, not external assets).
 */
export async function extractExternalStylesheetAssets(
  html: string,
  baseUrl: string,
  fetcher: StylesheetFetcher,
): Promise<AssetRecord[]> {
  const urls = collectExternalStylesheetUrls(html, baseUrl);
  if (urls.length === 0) return [];

  const fetched = await Promise.all(
    urls.map(async (u) => ({ url: u, result: await safeCall(() => fetcher(u)) })),
  );

  const out: AssetRecord[] = [];
  const seen = new Set<string>();
  for (const { url: stylesheetUrl, result } of fetched) {
    if (!result || !result.ok || !result.text) continue;
    for (const rule of walkCssRules(result.text)) {
      const bg = rule.declarations.get("background-image");
      const bgShort = rule.declarations.get("background");
      const candidates: string[] = [];
      if (bg) candidates.push(...extractUrlValues(bg));
      if (bgShort) candidates.push(...extractUrlValues(bgShort));
      for (const raw of candidates) {
        const absolute = resolveUrl(raw, stylesheetUrl);
        if (seen.has(absolute)) continue;
        seen.add(absolute);
        out.push({
          url: absolute,
          kind: "background",
          classification: "unknown",
          references: 1,
        });
      }
    }
  }
  return out;
}

/**
 * Fold stylesheet-discovered background assets into a Signals object's
 * inventory. Dedup is by absolute URL — existing entries (e.g. an img already
 * walked by parseImagery, or a background already in a `<style>` block) get
 * their `references` count incremented and keep their original kind. New URLs
 * land at the end with kind='background'/classification='unknown'.
 */
export function mergeStylesheetAssets(
  signals: Signals,
  extra: readonly AssetRecord[],
): Signals {
  if (extra.length === 0) return signals;
  const out: AssetRecord[] = signals.assetInventory.map((r) => ({ ...r }));
  const byUrl = new Map<string, AssetRecord>();
  for (const r of out) byUrl.set(r.url, r);
  for (const r of extra) {
    const existing = byUrl.get(r.url);
    if (existing) {
      existing.references += 1;
      continue;
    }
    const copy: AssetRecord = { ...r };
    out.push(copy);
    byUrl.set(copy.url, copy);
  }
  const backgroundCount = out.filter((a) => a.kind === "background").length;
  return {
    ...signals,
    imagery: { ...signals.imagery, backgroundCount },
    assetInventory: out,
  };
}

function extractUrlValues(value: string): string[] {
  const out: string[] = [];
  URL_FUNC.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = URL_FUNC.exec(value)) !== null) {
    const u = m[2].trim();
    if (u.length === 0) continue;
    if (u.startsWith("data:")) continue;
    out.push(u);
  }
  return out;
}

async function safeCall<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}
