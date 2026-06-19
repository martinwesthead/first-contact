import { collectInlineCss, parseHtml, type DomDocument } from "./dom.js";
import { parseDeclarations, splitSelectors, walkCssRules } from "./css-walk.js";
import {
  NOT_DETECTED,
  type LayoutBias,
  type LayoutDensity,
  type LayoutSignals,
} from "./schema.js";

const CONTENT_SELECTORS = new Set([
  ".container",
  ".wrapper",
  ".content",
  "main",
  "article",
  "body",
  "html",
  ".site",
  ".page",
  ".max-width",
]);

const DENSITY_TAGS = new Set([
  "P",
  "IMG",
  "BUTTON",
  "A",
  "LI",
  "SECTION",
  "ARTICLE",
  "FORM",
  "VIDEO",
  "PICTURE",
]);

/**
 * parseLayout — three signals:
 *
 *   - maxContentWidth: smallest declared max-width (in px) on a likely
 *     content selector (.container, main, article, body…). Anything outside
 *     the 400–2000px sanity band is ignored.
 *   - bias: 'centered' when a content selector declares `margin: 0 auto`
 *     (or the auto-side margin variant); 'left' when an explicit left
 *     alignment is declared; else `not_detected`.
 *   - density: heuristic on the first 40 descendants of <body> — count of
 *     content-bearing elements maps to sparse / balanced / dense.
 */
export function parseLayout(html: string): LayoutSignals {
  const { document } = parseHtml(html);
  const styleCss = collectInlineCss(document);

  let bestWidth: number | null = null;
  let bias: LayoutBias = NOT_DETECTED;

  const applyDecls = (
    selector: string,
    decls: ReadonlyMap<string, string>,
  ): void => {
    if (!CONTENT_SELECTORS.has(selector)) return;
    const mw = decls.get("max-width");
    if (mw) {
      const px = pxValue(mw);
      if (px !== null && px >= 400 && px <= 2000) {
        if (bestWidth === null || px < bestWidth) bestWidth = px;
      }
    }
    const margin = decls.get("margin");
    if (margin && /\bauto\b/.test(margin)) bias = "centered";
    const marginLeft = decls.get("margin-left");
    const marginRight = decls.get("margin-right");
    if (
      bias === NOT_DETECTED &&
      marginLeft === "auto" &&
      marginRight === "auto"
    ) {
      bias = "centered";
    }
    const textAlign = decls.get("text-align");
    if (bias === NOT_DETECTED && textAlign === "left") bias = "left";
  };

  for (const rule of walkCssRules(styleCss)) {
    for (const sel of splitSelectors(rule.selector)) {
      applyDecls(sel, rule.declarations);
    }
  }
  const withStyle = document.querySelectorAll("[style]");
  for (let i = 0; i < withStyle.length; i++) {
    const el = withStyle[i];
    const styleAttr = el.getAttribute("style");
    if (!styleAttr) continue;
    applyDecls(el.tagName.toLowerCase(), parseDeclarations(styleAttr));
  }

  const density = computeDensity(document);

  return {
    maxContentWidth: bestWidth !== null ? bestWidth : NOT_DETECTED,
    bias,
    density,
  };
}

function pxValue(raw: string): number | null {
  const m = raw.match(/^([0-9]+(?:\.[0-9]+)?)\s*px$/i);
  if (!m) return null;
  return Math.round(parseFloat(m[1]));
}

function computeDensity(doc: DomDocument): LayoutDensity {
  const body = doc.querySelector("body");
  if (!body) return NOT_DETECTED;
  const all = body.querySelectorAll("*");
  let count = 0;
  const cap = Math.min(all.length, 40);
  for (let i = 0; i < cap; i++) {
    if (DENSITY_TAGS.has(all[i].tagName)) count++;
  }
  if (count === 0) return NOT_DETECTED;
  if (count <= 4) return "sparse";
  if (count <= 10) return "balanced";
  return "dense";
}
