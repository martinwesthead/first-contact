import { collectInlineCss, parseHtml, type DomDocument, type DomElement } from "./dom.js";
import { parseDeclarations, splitSelectors, walkCssRules } from "./css-walk.js";
import { NOT_DETECTED, type PaletteSignals } from "./schema.js";

const BG_SELECTORS = new Set(["body", "html", ":root", "*"]);
const BODY_TEXT_SELECTORS = new Set(["body", "html", ":root", "*"]);
const HEADING_SELECTORS = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);
const CTA_SELECTORS = new Set([
  "button",
  ".cta",
  ".btn",
  ".button",
  "input[type=submit]",
  "input[type='submit']",
  'input[type="submit"]',
  "[type=submit]",
  "[role=button]",
  'a.button',
]);

const COLOR_VALUE = /(#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|hsla?\([^)]+\))/g;

interface ColorCandidate {
  value: string;
  selector: string;
  property: string;
}

/**
 * parsePalette — collects inline + linked CSS colors (from `<style>` blocks
 * and inline `style="..."` attributes only; external stylesheets are
 * deferred to REQ-22) and runs the role-inference ruleset documented on
 * REQ-21:
 *
 *   - background ← largest-area declaration; static-fetch heuristic is
 *     "color declared on body/html/:root background"
 *   - body       ← largest text-color cluster; heuristic is body/html color
 *   - accent     ← most-saturated non-body color; heuristic is color
 *                  declared on h1/h2/h3 selectors
 *   - cta        ← most-contrasting-to-background; heuristic is the
 *                  background-color declared on button / .cta / .btn etc.
 *
 * When inference is uncertain (no candidate matched the rule), the role is
 * set to `not_detected` and the color drops into `supporting`.
 */
export function parsePalette(html: string, _baseUrl: string): PaletteSignals {
  const { document } = parseHtml(html);
  const candidates = collectColorCandidates(document, collectInlineCss(document));

  const background = pickBackground(candidates);
  const body = pickBodyText(candidates);
  const cta = pickCta(candidates);
  const accent = pickAccent(candidates, body);

  const used = new Set<string>();
  for (const v of [background, body, accent, cta]) {
    if (v !== NOT_DETECTED) used.add(normalize(v));
  }
  const supporting: string[] = [];
  for (const c of candidates) {
    const v = normalize(c.value);
    if (used.has(v)) continue;
    if (supporting.includes(v)) continue;
    supporting.push(v);
    used.add(v);
    if (supporting.length >= 6) break;
  }

  return { background, body, accent, cta, supporting };
}

function collectColorCandidates(
  doc: DomDocument,
  styleCss: string,
): ColorCandidate[] {
  const out: ColorCandidate[] = [];

  for (const rule of walkCssRules(styleCss)) {
    const parts = splitSelectors(rule.selector);
    for (const sel of parts) {
      pushColors(out, sel, rule.declarations);
    }
  }

  const withStyle = doc.querySelectorAll("[style]");
  for (let i = 0; i < withStyle.length; i++) {
    const el = withStyle[i];
    const styleAttr = el.getAttribute("style");
    if (!styleAttr) continue;
    const decls = parseDeclarations(styleAttr);
    const inlineSel = inlineSelectorForElement(el);
    pushColors(out, inlineSel, decls);
  }

  return out;
}

function pushColors(
  out: ColorCandidate[],
  selector: string,
  declarations: ReadonlyMap<string, string>,
): void {
  const sel = selector.trim();
  for (const [prop, value] of declarations) {
    if (prop !== "color" && prop !== "background" && prop !== "background-color") {
      continue;
    }
    const matches = value.match(COLOR_VALUE);
    if (!matches) continue;
    for (const m of matches) {
      out.push({ value: m, selector: sel, property: prop });
    }
  }
}

function inlineSelectorForElement(el: DomElement): string {
  const tag = el.tagName.toLowerCase();
  return tag;
}

function pickBackground(candidates: ColorCandidate[]): string {
  for (const c of candidates) {
    if (!isBgProp(c.property)) continue;
    if (BG_SELECTORS.has(c.selector)) return c.value;
  }
  // Fallback: first background color declared anywhere.
  for (const c of candidates) {
    if (isBgProp(c.property)) return c.value;
  }
  return NOT_DETECTED;
}

function pickBodyText(candidates: ColorCandidate[]): string {
  for (const c of candidates) {
    if (c.property !== "color") continue;
    if (BODY_TEXT_SELECTORS.has(c.selector)) return c.value;
  }
  return NOT_DETECTED;
}

function pickAccent(candidates: ColorCandidate[], body: string): string {
  const bodyN = body === NOT_DETECTED ? null : normalize(body);
  for (const c of candidates) {
    if (c.property !== "color") continue;
    if (!HEADING_SELECTORS.has(c.selector)) continue;
    if (bodyN && normalize(c.value) === bodyN) continue;
    return c.value;
  }
  return NOT_DETECTED;
}

function pickCta(candidates: ColorCandidate[]): string {
  for (const c of candidates) {
    if (!isBgProp(c.property)) continue;
    if (CTA_SELECTORS.has(c.selector)) return c.value;
  }
  return NOT_DETECTED;
}

function isBgProp(prop: string): boolean {
  return prop === "background" || prop === "background-color";
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "");
}
