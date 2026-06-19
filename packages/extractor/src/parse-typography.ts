import { collectInlineCss, parseHtml } from "./dom.js";
import { parseDeclarations, splitSelectors, walkCssRules } from "./css-walk.js";
import {
  NOT_DETECTED,
  type PrimaryPair,
  type TypeStyle,
  type TypographySignals,
} from "./schema.js";

const BODY_SELECTORS = new Set(["body", "html", ":root", "*"]);

/**
 * parseTypography — extracts font-family / font-size / font-weight from
 * declared styles only (static fetch can't compute, so this signal is often
 * `not_detected`; REQ-22's rendered path makes it much richer).
 *
 * - body type ← declarations on body / html / :root / *
 * - h1/h2/h3 ← declarations on those selectors
 * - primaryPair ← if both body family and at least one heading family are
 *   declared, return { heading, body }; else `not_detected`.
 */
export function parseTypography(html: string, _baseUrl: string): TypographySignals {
  const { document } = parseHtml(html);
  const styleCss = collectInlineCss(document);

  const bodyDecls = new Map<string, string>();
  const h1Decls = new Map<string, string>();
  const h2Decls = new Map<string, string>();
  const h3Decls = new Map<string, string>();

  for (const rule of walkCssRules(styleCss)) {
    for (const sel of splitSelectors(rule.selector)) {
      if (BODY_SELECTORS.has(sel)) merge(bodyDecls, rule.declarations);
      if (sel === "h1") merge(h1Decls, rule.declarations);
      if (sel === "h2") merge(h2Decls, rule.declarations);
      if (sel === "h3") merge(h3Decls, rule.declarations);
    }
  }

  const withStyle = document.querySelectorAll("[style]");
  for (let i = 0; i < withStyle.length; i++) {
    const el = withStyle[i];
    const tag = el.tagName.toLowerCase();
    if (tag !== "body" && tag !== "html" && tag !== "h1" && tag !== "h2" && tag !== "h3") {
      continue;
    }
    const styleAttr = el.getAttribute("style");
    if (!styleAttr) continue;
    const inline = parseDeclarations(styleAttr);
    if (tag === "body" || tag === "html") merge(bodyDecls, inline);
    else if (tag === "h1") merge(h1Decls, inline);
    else if (tag === "h2") merge(h2Decls, inline);
    else if (tag === "h3") merge(h3Decls, inline);
  }

  const body = readTypeStyle(bodyDecls);
  const h1 = readTypeStyle(h1Decls);
  const h2 = readTypeStyle(h2Decls);
  const h3 = readTypeStyle(h3Decls);

  const headingFamily = pickFirst([h1.family, h2.family, h3.family]);
  let primaryPair: PrimaryPair = NOT_DETECTED;
  if (body.family !== NOT_DETECTED && headingFamily) {
    primaryPair = { heading: headingFamily, body: body.family };
  }

  return { body, h1, h2, h3, primaryPair };
}

function readTypeStyle(decls: ReadonlyMap<string, string>): TypeStyle {
  const family = decls.get("font-family");
  const size = decls.get("font-size");
  const weight = decls.get("font-weight");
  const shorthand = decls.get("font");
  let f = family;
  let s = size;
  let w = weight;
  if (shorthand && (!f || !s || !w)) {
    const sh = parseFontShorthand(shorthand);
    if (!f && sh.family) f = sh.family;
    if (!s && sh.size) s = sh.size;
    if (!w && sh.weight) w = sh.weight;
  }
  return {
    family: f && f.length > 0 ? f : NOT_DETECTED,
    size: s && s.length > 0 ? s : NOT_DETECTED,
    weight: w && w.length > 0 ? w : NOT_DETECTED,
  };
}

interface ShorthandParts {
  family?: string;
  size?: string;
  weight?: string;
}

function parseFontShorthand(value: string): ShorthandParts {
  const out: ShorthandParts = {};
  const tokens = value.split(/\s+/);
  for (const tok of tokens) {
    if (/^\d+$/.test(tok) || /^(bold|bolder|lighter|normal)$/i.test(tok)) {
      if (!out.weight) out.weight = tok;
    } else if (/\d/.test(tok) && /(px|em|rem|%|pt)/.test(tok)) {
      if (!out.size) out.size = tok.split("/")[0];
    }
  }
  // family is everything that wasn't a weight/size/style — anything after the
  // size token.
  const sizeIdx = out.size ? value.indexOf(out.size) : -1;
  if (sizeIdx >= 0) {
    const after = value.slice(sizeIdx + (out.size?.length ?? 0)).trim();
    if (after.length > 0) out.family = after.replace(/^\s*\/[^\s]+\s*/, "").trim();
  }
  return out;
}

function merge(into: Map<string, string>, from: ReadonlyMap<string, string>): void {
  for (const [k, v] of from) into.set(k, v);
}

function pickFirst(values: ReadonlyArray<string>): string | null {
  for (const v of values) if (v !== NOT_DETECTED && v.length > 0) return v;
  return null;
}
