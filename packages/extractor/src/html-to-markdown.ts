import { parseHTML } from "linkedom";

/**
 * Convert HTML to a minimal markdown subset matching what the framework's
 * markdown renderer accepts. Mechanical — no LLM — used by `transcribe_site`
 * Stage 5 to write per-section copy `.md` files to R2 from captured source
 * HTML.
 *
 * Supported elements (kept):
 *   - h1–h6 → ATX heading (#, ##, …)
 *   - p → paragraph (blank-line separated)
 *   - ul, ol, li → list items (`- ` / `1. `)
 *   - strong, b → **bold**
 *   - em, i → *italic*
 *   - code → `inline-code`
 *   - blockquote → `> text`
 *   - a[href] → [text](href)
 *   - img[src] → ![alt](src)
 *   - br → newline
 *
 * Dropped silently:
 *   - script, style, head, noscript, iframe, svg, canvas, video, audio
 *   - All attributes other than href/src/alt
 *   - Inline `style=""`, CSS classes, custom data-* attributes
 *
 * Unknown tags fall through to their children's text.
 */
export function htmlToMarkdown(html: string): string {
  const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`);
  const root = document.body as unknown as Node;
  const out: string[] = [];
  walkBlock(root, out);
  return collapse(out.join("\n\n")).trim();
}

interface Node {
  readonly nodeType: number;
  readonly nodeName: string;
  readonly textContent: string | null;
  readonly childNodes: ArrayLike<Node>;
  getAttribute?(name: string): string | null;
}

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "HEAD",
  "IFRAME",
  "SVG",
  "CANVAS",
  "VIDEO",
  "AUDIO",
  "META",
  "LINK",
  "TEMPLATE",
]);

const BLOCK_TAGS = new Set([
  "P",
  "DIV",
  "SECTION",
  "ARTICLE",
  "HEADER",
  "FOOTER",
  "MAIN",
  "ASIDE",
  "NAV",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "UL",
  "OL",
  "BLOCKQUOTE",
  "HR",
  "PRE",
  "FIGURE",
]);

function walkBlock(node: Node, out: string[]): void {
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    if (child.nodeType === TEXT_NODE) {
      const t = (child.textContent ?? "").trim();
      if (t) out.push(escapeMarkdown(t));
      continue;
    }
    if (child.nodeType !== ELEMENT_NODE) continue;
    const tag = child.nodeName.toUpperCase();
    if (SKIP_TAGS.has(tag)) continue;

    if (/^H[1-6]$/.test(tag)) {
      const level = parseInt(tag.charAt(1), 10);
      const text = renderInline(child).trim();
      if (text) out.push(`${"#".repeat(level)} ${text}`);
      continue;
    }

    if (tag === "P") {
      const text = renderInline(child).trim();
      if (text) out.push(text);
      continue;
    }

    if (tag === "UL" || tag === "OL") {
      const items: string[] = [];
      for (let j = 0; j < child.childNodes.length; j++) {
        const li = child.childNodes[j];
        if (li.nodeType !== ELEMENT_NODE) continue;
        if ((li.nodeName ?? "").toUpperCase() !== "LI") continue;
        const text = renderInline(li).trim();
        if (text) {
          const prefix = tag === "UL" ? "- " : `${items.length + 1}. `;
          items.push(`${prefix}${text}`);
        }
      }
      if (items.length > 0) out.push(items.join("\n"));
      continue;
    }

    if (tag === "BLOCKQUOTE") {
      const text = renderInline(child).trim();
      if (text) out.push(`> ${text}`);
      continue;
    }

    if (tag === "PRE") {
      const text = (child.textContent ?? "").trim();
      if (text) out.push("```\n" + text + "\n```");
      continue;
    }

    if (tag === "HR") {
      out.push("---");
      continue;
    }

    if (tag === "IMG") {
      const src = child.getAttribute ? (child.getAttribute("src") ?? "") : "";
      const alt = child.getAttribute ? (child.getAttribute("alt") ?? "") : "";
      if (src) out.push(`![${alt}](${src})`);
      continue;
    }

    if (BLOCK_TAGS.has(tag)) {
      // Container — recurse into children at block level.
      walkBlock(child, out);
      continue;
    }

    // Inline-level element at block scope — wrap as paragraph.
    const text = renderInline(child).trim();
    if (text) out.push(text);
  }
}

function renderInline(node: Node): string {
  const parts: string[] = [];
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    if (child.nodeType === TEXT_NODE) {
      parts.push(escapeMarkdown(child.textContent ?? ""));
      continue;
    }
    if (child.nodeType !== ELEMENT_NODE) continue;
    const tag = child.nodeName.toUpperCase();
    if (SKIP_TAGS.has(tag)) continue;

    if (tag === "BR") {
      parts.push("\n");
      continue;
    }
    if (tag === "STRONG" || tag === "B") {
      const inner = renderInline(child).trim();
      if (inner) parts.push(`**${inner}**`);
      continue;
    }
    if (tag === "EM" || tag === "I") {
      const inner = renderInline(child).trim();
      if (inner) parts.push(`*${inner}*`);
      continue;
    }
    if (tag === "CODE") {
      const inner = (child.textContent ?? "").trim();
      if (inner) parts.push("`" + inner + "`");
      continue;
    }
    if (tag === "A") {
      const href = child.getAttribute ? (child.getAttribute("href") ?? "") : "";
      const inner = renderInline(child).trim();
      if (inner && href) parts.push(`[${inner}](${href})`);
      else if (inner) parts.push(inner);
      continue;
    }
    if (tag === "IMG") {
      const src = child.getAttribute ? (child.getAttribute("src") ?? "") : "";
      const alt = child.getAttribute ? (child.getAttribute("alt") ?? "") : "";
      if (src) parts.push(`![${alt}](${src})`);
      continue;
    }
    // Other inline / unknown tags: pass through children.
    parts.push(renderInline(child));
  }
  return parts.join("");
}

function escapeMarkdown(s: string): string {
  // Collapse runs of whitespace inside text nodes; preserves intentional
  // sentence spacing without leaking source-HTML indentation.
  return s.replace(/\s+/g, " ");
}

function collapse(s: string): string {
  return s.replace(/\n{3,}/g, "\n\n");
}

/**
 * Rewrite image references in markdown text so any `![alt](url)` whose `url`
 * appears in `urlToR2Key` is replaced with `![alt](/{assetUrlPrefix}{r2Key})`.
 * Used after `htmlToMarkdown` by `transcribe_site` Stage 5 to point mirrored
 * images at their R2 keys, preserving alt text verbatim.
 */
export function rewriteMarkdownImageRefs(
  markdown: string,
  urlToR2Key: ReadonlyMap<string, string>,
  assetUrlPrefix = "/assets/",
): string {
  return markdown.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt: string, src: string) => {
    const key = urlToR2Key.get(src);
    if (!key) return `![${alt}](${src})`;
    return `![${alt}](${assetUrlPrefix}${key})`;
  });
}
