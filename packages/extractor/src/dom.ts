import { parseHTML } from "linkedom";

/**
 * Minimal structural DOM types — kept LOCAL to the extractor so consuming
 * packages (control-app, builder-ui) don't need a `DOM` lib in their
 * tsconfig. linkedom's runtime objects satisfy these shapes, but we never
 * leak the linkedom (or global Document) types through the public API.
 */

export interface DomElement {
  readonly tagName: string;
  readonly parentElement: DomElement | null;
  readonly textContent: string | null;
  getAttribute(name: string): string | null;
  querySelectorAll(selector: string): DomNodeList;
}

export interface DomNodeList {
  readonly length: number;
  [index: number]: DomElement;
}

export interface DomDocument {
  querySelector(selector: string): DomElement | null;
  querySelectorAll(selector: string): DomNodeList;
}

export interface ParsedHtml {
  readonly document: DomDocument;
}

export function parseHtml(html: string): ParsedHtml {
  const { document } = parseHTML(html);
  return { document: document as unknown as DomDocument };
}

export function resolveUrl(raw: string, baseUrl: string): string {
  if (!raw) return raw;
  try {
    return new URL(raw, baseUrl).toString();
  } catch {
    return raw;
  }
}

export function collectInlineCss(doc: DomDocument): string {
  const styles = doc.querySelectorAll("style");
  const parts: string[] = [];
  for (let i = 0; i < styles.length; i++) {
    const s = styles[i];
    if (s.textContent) parts.push(s.textContent);
  }
  return parts.join("\n");
}

export function hasNoStylesheets(doc: DomDocument): boolean {
  const styles = doc.querySelectorAll("style");
  const links = doc.querySelectorAll("link[rel='stylesheet']");
  let inlineCount = 0;
  const all = doc.querySelectorAll("[style]");
  for (let i = 0; i < all.length; i++) {
    const v = all[i].getAttribute("style");
    if (v && v.trim().length > 0) inlineCount++;
  }
  return styles.length === 0 && links.length === 0 && inlineCount === 0;
}

export function hasAncestor(el: DomElement, tag: string): boolean {
  const target = tag.toUpperCase();
  let cur: DomElement | null = el.parentElement;
  while (cur) {
    if (cur.tagName === target) return true;
    cur = cur.parentElement;
  }
  return false;
}
