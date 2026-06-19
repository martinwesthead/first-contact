/**
 * Tiny CSS rule walker. Tokenizes a stylesheet body into top-level rules
 * (selector + declarations). At-rules other than `@media` are skipped; rules
 * inside `@media` blocks are yielded as if they were top-level (the media
 * query is ignored). Nested at-rules deeper than `@media` are skipped.
 *
 * This is NOT a full CSS parser — it handles the subset of declarations the
 * Layer A extractors care about (color, background, background-image,
 * font-family, font-size, font-weight, max-width, margin, padding).
 */

export interface CssRule {
  readonly selector: string;
  readonly declarations: ReadonlyMap<string, string>;
}

export function* walkCssRules(css: string): Generator<CssRule> {
  let i = 0;
  const n = css.length;
  while (i < n) {
    i = skipWs(css, i);
    if (i >= n) break;

    if (css[i] === "@") {
      const atName = readAtRuleName(css, i);
      const atEnd = css.indexOf("{", i);
      if (atEnd === -1) {
        // No block — at-rule terminated by ';'.
        const semi = css.indexOf(";", i);
        if (semi === -1) return;
        i = semi + 1;
        continue;
      }
      if (atName.toLowerCase() === "@media") {
        // Recurse into the @media block contents at top level.
        const blockEnd = findMatchingBrace(css, atEnd);
        if (blockEnd === -1) return;
        const inner = css.slice(atEnd + 1, blockEnd);
        yield* walkCssRules(inner);
        i = blockEnd + 1;
        continue;
      }
      const blockEnd = findMatchingBrace(css, atEnd);
      if (blockEnd === -1) return;
      i = blockEnd + 1;
      continue;
    }

    const braceOpen = css.indexOf("{", i);
    if (braceOpen === -1) return;
    const selector = css.slice(i, braceOpen).trim().replace(/\s+/g, " ");
    const blockEnd = findMatchingBrace(css, braceOpen);
    if (blockEnd === -1) return;
    const declBlock = css.slice(braceOpen + 1, blockEnd);
    const declarations = parseDeclarations(declBlock);
    if (selector.length > 0) {
      yield { selector, declarations };
    }
    i = blockEnd + 1;
  }
}

export function parseDeclarations(block: string): Map<string, string> {
  const out = new Map<string, string>();
  let depth = 0;
  let current = "";
  for (let i = 0; i < block.length; i++) {
    const ch = block[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === ";" && depth === 0) {
      addDeclaration(out, current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim().length > 0) addDeclaration(out, current);
  return out;
}

function addDeclaration(out: Map<string, string>, raw: string): void {
  const colon = raw.indexOf(":");
  if (colon === -1) return;
  const prop = raw.slice(0, colon).trim().toLowerCase();
  let value = raw.slice(colon + 1).trim();
  if (value.endsWith("!important")) {
    value = value.slice(0, value.length - "!important".length).trim();
  }
  if (prop.length === 0 || value.length === 0) return;
  out.set(prop, value);
}

function skipWs(css: string, i: number): number {
  while (i < css.length) {
    const ch = css[i];
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }
    // skip block comment
    if (ch === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      if (end === -1) return css.length;
      i = end + 2;
      continue;
    }
    break;
  }
  return i;
}

function readAtRuleName(css: string, i: number): string {
  let j = i;
  while (j < css.length) {
    const ch = css[j];
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "{" || ch === ";") {
      break;
    }
    j++;
  }
  return css.slice(i, j);
}

function findMatchingBrace(css: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < css.length; i++) {
    const ch = css[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Split a CSS selector list ("h1, h2, .accent") into normalized parts.
 */
export function splitSelectors(selector: string): string[] {
  return selector
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
