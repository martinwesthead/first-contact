import {
  collectInlineCss,
  hasAncestor,
  parseHtml,
  resolveUrl,
  type DomElement,
} from "./dom.js";
import { walkCssRules } from "./css-walk.js";
import type {
  AssetClassification,
  AssetKind,
  AssetRecord,
  ImagerySignals,
} from "./schema.js";

export interface ImageryResult {
  signals: ImagerySignals;
  assetInventory: AssetRecord[];
}

interface MutableAsset {
  url: string;
  kind: AssetKind;
  alt?: string;
  classification: AssetClassification;
  width?: number;
  height?: number;
  references: number;
  docOrder: number;
  inNav: boolean;
}

const URL_FUNC = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;

/**
 * parseImagery — walks every visual asset reference and produces the asset
 * inventory + a small summary. Discovery order is `<img>` → inline
 * `style="background-image"` → `<style>` `background-image` rules → `<video>`
 * / `<source>` — the first kind wins on dedup (so an img also referenced
 * from a background-image inventory rule stays kind='img'). Each dedup key
 * is the absolute URL; `references` counts every appearance across all
 * paths.
 *
 * Classification heuristics (static-fetch path; lacking computed layout we
 * lean on declared width/height attributes + position in the DOM):
 *
 *   - decorative: inside `<nav>` ancestor OR declared dimensions both < 200
 *   - hero: largest declared area among the first 3 imgs in document order,
 *           area must be >= 480_000 (e.g. ≥ 800×600)
 *   - everything else: unknown
 *
 * Backgrounds and videos default to `unknown` (the operator's transcription
 * step picks the real classification after Browser Rendering lands).
 */
export function parseImagery(html: string, baseUrl: string): ImageryResult {
  const { document } = parseHtml(html);
  const records: MutableAsset[] = [];
  const byUrl = new Map<string, MutableAsset>();

  let docOrder = 0;

  const push = (
    rawUrl: string | null | undefined,
    kind: AssetKind,
    extras: {
      alt?: string;
      width?: number;
      height?: number;
      inNav?: boolean;
    },
  ): void => {
    if (!rawUrl) return;
    const url = resolveUrl(rawUrl, baseUrl);
    const existing = byUrl.get(url);
    if (existing) {
      existing.references += 1;
      // First-discovered kind wins. For img vs background, img wins because
      // we walk imgs first.
      return;
    }
    const record: MutableAsset = {
      url,
      kind,
      alt: extras.alt,
      classification: "unknown",
      width: extras.width,
      height: extras.height,
      references: 1,
      docOrder: docOrder++,
      inNav: extras.inNav ?? false,
    };
    records.push(record);
    byUrl.set(url, record);
  };

  // 1. <img>
  const imgs = document.querySelectorAll("img");
  for (let i = 0; i < imgs.length; i++) {
    const el = imgs[i];
    const src = el.getAttribute("src");
    const alt = el.getAttribute("alt") ?? undefined;
    const w = readNumberAttr(el, "width");
    const h = readNumberAttr(el, "height");
    const inNav = hasAncestor(el, "nav");
    push(src, "img", { alt, width: w, height: h, inNav });

    const srcset = el.getAttribute("srcset");
    if (srcset) {
      for (const u of splitSrcset(srcset)) {
        push(u, "img", { alt, width: w, height: h, inNav });
      }
    }
  }

  // 2. inline style="background-image: url(...)"
  const withStyle = document.querySelectorAll("[style]");
  for (let i = 0; i < withStyle.length; i++) {
    const el = withStyle[i];
    const styleAttr = el.getAttribute("style");
    if (!styleAttr) continue;
    if (!/background(-image)?\s*:/.test(styleAttr)) continue;
    const inNav = hasAncestor(el, "nav");
    for (const u of extractBgImageUrls(styleAttr)) {
      push(u, "background", { inNav });
    }
  }

  // 3. <style> block CSS rules with background-image
  const css = collectInlineCss(document);
  for (const rule of walkCssRules(css)) {
    const bg = rule.declarations.get("background-image");
    const bgShort = rule.declarations.get("background");
    const sources: string[] = [];
    if (bg) sources.push(...extractBgImageUrls(bg));
    if (bgShort) sources.push(...extractBgImageUrls(bgShort));
    for (const u of sources) push(u, "background", {});
  }

  // 4. <video src> + <source src> inside <video>
  const videos = document.querySelectorAll("video");
  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    const src = v.getAttribute("src");
    push(src, "video", {});
    const sources = v.querySelectorAll("source");
    for (let j = 0; j < sources.length; j++) {
      const s = sources[j].getAttribute("src");
      push(s, "video", {});
    }
  }

  classify(records);

  const inventory: AssetRecord[] = records.map((r) => {
    const out: AssetRecord = {
      url: r.url,
      kind: r.kind,
      classification: r.classification,
      references: r.references,
    };
    if (r.alt !== undefined) out.alt = r.alt;
    if (r.width !== undefined) out.width = r.width;
    if (r.height !== undefined) out.height = r.height;
    return out;
  });

  const imgCount = inventory.filter((a) => a.kind === "img").length;
  const backgroundCount = inventory.filter((a) => a.kind === "background").length;
  const videoCount = inventory.filter((a) => a.kind === "video").length;
  const heroDetected = inventory.some((a) => a.classification === "hero");

  return {
    signals: { imgCount, backgroundCount, videoCount, heroDetected },
    assetInventory: inventory,
  };
}

function classify(records: MutableAsset[]): void {
  let heroIdx = -1;
  let heroArea = 0;
  const topImgIndices: number[] = [];
  for (let i = 0; i < records.length; i++) {
    if (records[i].kind === "img") topImgIndices.push(i);
    if (topImgIndices.length >= 3) break;
  }
  for (const idx of topImgIndices) {
    const r = records[idx];
    if (r.width && r.height) {
      const area = r.width * r.height;
      if (area > heroArea) {
        heroArea = area;
        heroIdx = idx;
      }
    }
  }

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (r.kind !== "img") continue;
    if (r.inNav) {
      r.classification = "decorative";
      continue;
    }
    if (
      typeof r.width === "number" &&
      typeof r.height === "number" &&
      r.width < 200 &&
      r.height < 200
    ) {
      r.classification = "decorative";
      continue;
    }
    if (i === heroIdx && heroArea >= 480_000) {
      r.classification = "hero";
      continue;
    }
    r.classification = "unknown";
  }
}

function readNumberAttr(el: DomElement, name: string): number | undefined {
  const raw = el.getAttribute(name);
  if (!raw) return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

function splitSrcset(srcset: string): string[] {
  const out: string[] = [];
  for (const part of srcset.split(",")) {
    const url = part.trim().split(/\s+/)[0];
    if (url) out.push(url);
  }
  return out;
}

function extractBgImageUrls(value: string): string[] {
  const out: string[] = [];
  URL_FUNC.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = URL_FUNC.exec(value)) !== null) {
    const url = m[2].trim();
    if (url.length > 0) out.push(url);
  }
  return out;
}
