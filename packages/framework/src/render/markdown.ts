import type { AssetRef, ModuleInstance } from "@1stcontact/site-schema";
import { meta as bannerMeta } from "../modules/banner/meta.js";
import { meta as headerMeta } from "../modules/header/meta.js";
import { meta as heroMeta } from "../modules/hero/meta.js";
import { meta as footerMeta } from "../modules/footer/meta.js";
import { meta as textBlockMeta } from "../modules/text-block/meta.js";
import { meta as servicesGridMeta } from "../modules/services-grid/meta.js";
import { meta as contactFormMeta } from "../modules/contact-form/meta.js";
import type {
  ContentFieldType,
  ContentSchema,
  ModuleMeta,
} from "../modules/types.js";

const METAS_BY_ID: Record<string, ModuleMeta> = {
  [headerMeta.id]: headerMeta,
  [heroMeta.id]: heroMeta,
  [bannerMeta.id]: bannerMeta,
  [footerMeta.id]: footerMeta,
  [textBlockMeta.id]: textBlockMeta,
  [servicesGridMeta.id]: servicesGridMeta,
  [contactFormMeta.id]: contactFormMeta,
};

export type ResolveAsset = (ref: AssetRef) => string | undefined;

/**
 * Convert a markdown content field value to a ready-to-set-as-html string.
 *
 * Rules (REQ-33):
 *   - undefined / null → "".
 *   - String starting with `<` → trusted HTML passthrough (preserves the
 *     1stcontact baseline's inline `<p>` strings).
 *   - String otherwise → markdownToHtml.
 *   - AssetRef-text (kind: "text") → resolveAsset(ref) → markdown → HTML;
 *     undefined / throw → escaped `alt` fallback.
 */
export function resolveMarkdownField(
  value: unknown,
  resolveAsset?: ResolveAsset,
): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") {
    return renderMarkdownString(value);
  }
  if (isAssetRefText(value)) {
    let resolved: string | undefined;
    if (resolveAsset) {
      try {
        resolved = resolveAsset(value as AssetRef);
      } catch {
        resolved = undefined;
      }
    }
    if (typeof resolved === "string") {
      return renderMarkdownString(resolved);
    }
    return escapeHtml(value.alt ?? "");
  }
  return "";
}

function renderMarkdownString(s: string): string {
  if (s.length === 0) return "";
  if (s.trimStart().startsWith("<")) return s;
  return markdownToHtml(s);
}

/**
 * Walk a module instance's content using its declared `contentSchema` and
 * replace every markdown-typed field with the HTML string produced by
 * `resolveMarkdownField`. Used by `tools/generate` to bake AssetRef-text
 * body copy into static output at build time.
 *
 * Returns a NEW content object — does not mutate the input.
 */
export function bakeModuleContentForRender(
  instance: ModuleInstance,
  resolveAsset?: ResolveAsset,
): Record<string, unknown> | undefined {
  if (!instance.content) return instance.content;
  const entry = tryGetModule(instance.type, instance.version);
  if (!entry) return { ...instance.content };
  return bakeContent(
    entry.meta.contentSchema,
    instance.content as Record<string, unknown>,
    resolveAsset,
  );
}

function tryGetModule(
  type: string,
  _version: number,
): { meta: ModuleMeta } | undefined {
  const meta = METAS_BY_ID[type];
  if (!meta) return undefined;
  return { meta };
}

function bakeContent(
  schema: ContentSchema,
  content: Record<string, unknown>,
  resolveAsset?: ResolveAsset,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, spec] of Object.entries(schema)) {
    const value = content[name];
    if (value === undefined) continue;
    out[name] = bakeValue(spec.type, value, resolveAsset);
  }
  // Preserve any extra fields not in schema (e.g. tool calls with passthrough).
  for (const [name, value] of Object.entries(content)) {
    if (!(name in schema)) out[name] = value;
  }
  return out;
}

function bakeValue(
  type: ContentFieldType,
  value: unknown,
  resolveAsset?: ResolveAsset,
): unknown {
  if (typeof type === "string") {
    if (type === "markdown") {
      return resolveMarkdownField(value, resolveAsset);
    }
    return value;
  }
  if (type.kind === "list-of" && Array.isArray(value)) {
    return value.map((v) => bakeValue(type.of, v, resolveAsset));
  }
  if (
    type.kind === "object" &&
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return bakeContent(
      type.fields,
      value as Record<string, unknown>,
      resolveAsset,
    );
  }
  return value;
}

/**
 * Collect every AssetRef-text `src` referenced by markdown content fields in
 * a module's content tree, so `tools/generate` can prefetch them in parallel
 * before the synchronous bake. Used to populate the resolver's backing
 * cache.
 */
export function collectTextAssetSrcsForInstance(
  instance: ModuleInstance,
): string[] {
  if (!instance.content) return [];
  const entry = tryGetModule(instance.type, instance.version);
  if (!entry) return collectFromValueGeneric(instance.content);
  const out: string[] = [];
  const seen = new Set<string>();
  walkSchema(
    entry.meta.contentSchema,
    instance.content as Record<string, unknown>,
    (src) => {
      if (!seen.has(src)) {
        seen.add(src);
        out.push(src);
      }
    },
  );
  return out;
}

function walkSchema(
  schema: ContentSchema,
  content: Record<string, unknown>,
  visit: (src: string) => void,
): void {
  for (const [name, spec] of Object.entries(schema)) {
    const value = content[name];
    if (value === undefined) continue;
    walkValue(spec.type, value, visit);
  }
}

function walkValue(
  type: ContentFieldType,
  value: unknown,
  visit: (src: string) => void,
): void {
  if (typeof type === "string") {
    if (type === "markdown" && isAssetRefText(value)) {
      visit(value.src);
    }
    return;
  }
  if (type.kind === "list-of" && Array.isArray(value)) {
    for (const v of value) walkValue(type.of, v, visit);
    return;
  }
  if (
    type.kind === "object" &&
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    walkSchema(type.fields, value as Record<string, unknown>, visit);
  }
}

function collectFromValueGeneric(value: unknown, out: string[] = [], seen = new Set<string>()): string[] {
  if (!value) return out;
  if (Array.isArray(value)) {
    for (const v of value) collectFromValueGeneric(v, out, seen);
    return out;
  }
  if (typeof value !== "object") return out;
  const obj = value as Record<string, unknown>;
  if (obj.kind === "text" && typeof obj.src === "string") {
    if (!seen.has(obj.src)) {
      seen.add(obj.src);
      out.push(obj.src);
    }
    return out;
  }
  for (const v of Object.values(obj)) collectFromValueGeneric(v, out, seen);
  return out;
}

function isAssetRefText(
  value: unknown,
): value is { kind: "text"; src: string; id: string; alt?: string } {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.kind === "text" &&
    typeof v.src === "string" &&
    v.src.length > 0 &&
    typeof v.id === "string" &&
    v.id.length > 0
  );
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>]/g, (c) => {
    if (c === "&") return "&amp;";
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    return c;
  });
}

/**
 * Minimal markdown-to-HTML implementation matching the browser renderer.
 * Supports: ATX headings, paragraphs, unordered/ordered lists, blockquotes,
 * inline **bold**, *italic*, `code`, [text](url), ![alt](src).
 *
 * Self-contained — no runtime deps. The exact format must stay in sync with
 * `browser.ts::markdownToHtml`; both share the same source-of-truth.
 */
export function markdownToHtml(input: string): string {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      i++;
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${renderInline(buf.join(" "))}</blockquote>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      out.push(
        `<ul>${items.map((t) => `<li>${renderInline(t)}</li>`).join("")}</ul>`,
      );
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      out.push(
        `<ol>${items.map((t) => `<li>${renderInline(t)}</li>`).join("")}</ol>`,
      );
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !isBlockStart(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    out.push(`<p>${renderInline(buf.join(" "))}</p>`);
  }
  return out.join("\n");
}

function isBlockStart(line: string): boolean {
  return (
    /^(#{1,6})\s+/.test(line) ||
    /^\s*>\s?/.test(line) ||
    /^\s*[-*]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line)
  );
}

function renderInline(text: string): string {
  let s = escapeHtml(text);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt: string, src: string) => {
    return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" />`;
  });
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) => {
    return `<a href="${escapeAttr(href)}">${label}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  return s;
}

function escapeAttr(value: unknown): string {
  return String(value ?? "").replace(/[&<>"]/g, (c) => {
    if (c === "&") return "&amp;";
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    if (c === '"') return "&quot;";
    return c;
  });
}

