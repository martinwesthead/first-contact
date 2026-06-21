import type { ThemeTokens } from "@1stcontact/site-schema";
import { defaultThemeTokens } from "@1stcontact/framework/tokens";
import {
  NOT_DETECTED,
  type ReferenceDigest,
} from "./schema.js";

export type Confidence = "high" | "medium" | "low";

export interface TranscribedThemeTokens {
  readonly palette: Partial<ThemeTokens["palette"]>;
  readonly typography: { readonly family?: Partial<ThemeTokens["typography"]["family"]> };
  readonly confidence: {
    readonly palette: Confidence;
    readonly typography: Confidence;
    readonly layout: Confidence;
  };
}

/**
 * Map digest palette + typography signals deterministically to a theme-token
 * patch. Pure function — no LLM. Returns only the fields the digest actually
 * detected; callers merge with `defaultThemeTokens` for unset slots.
 */
export function deriveThemeTokens(digest: ReferenceDigest): TranscribedThemeTokens {
  const { palette: pal, typography: typ } = digest.signals;

  const palette: Partial<ThemeTokens["palette"]> = {};
  let paletteRoles = 0;
  if (pal.background !== NOT_DETECTED) {
    palette.bg = normalizeHex(pal.background);
    paletteRoles++;
  }
  if (pal.body !== NOT_DETECTED) {
    palette.text = normalizeHex(pal.body);
    paletteRoles++;
  }
  if (pal.accent !== NOT_DETECTED) {
    palette.accent = normalizeHex(pal.accent);
    paletteRoles++;
  }
  if (pal.cta !== NOT_DETECTED) {
    palette.primary = normalizeHex(pal.cta);
    paletteRoles++;
  }

  const family: Partial<ThemeTokens["typography"]["family"]> = {};
  if (typ.primaryPair !== NOT_DETECTED) {
    family.body = typ.primaryPair.body;
    family.heading = typ.primaryPair.heading;
  } else {
    if (typ.body.family !== NOT_DETECTED) family.body = typ.body.family;
    const headingFamily =
      typ.h1.family !== NOT_DETECTED
        ? typ.h1.family
        : typ.h2.family !== NOT_DETECTED
          ? typ.h2.family
          : null;
    if (headingFamily) family.heading = headingFamily;
  }

  const paletteConf: Confidence =
    paletteRoles >= 3 ? "high" : paletteRoles >= 1 ? "medium" : "low";
  const typographyConf: Confidence =
    typ.primaryPair !== NOT_DETECTED
      ? "high"
      : family.body || family.heading
        ? "medium"
        : "low";

  return {
    palette,
    typography: { family },
    confidence: {
      palette: paletteConf,
      typography: typographyConf,
      layout: "medium",
    },
  };
}

/**
 * Merge a partial theme-token patch onto `defaultThemeTokens`. Returns a full
 * ThemeTokens object — used by callers (e.g. the digest builder) that need a
 * complete shape for the digest payload.
 */
export function applyTokenPatch(patch: TranscribedThemeTokens): ThemeTokens {
  const out: ThemeTokens = JSON.parse(JSON.stringify(defaultThemeTokens));
  for (const [k, v] of Object.entries(patch.palette)) {
    if (v) (out.palette as Record<string, string>)[k] = v;
  }
  if (patch.typography.family?.body) {
    out.typography.family.body = patch.typography.family.body;
  }
  if (patch.typography.family?.heading) {
    out.typography.family.heading = patch.typography.family.heading;
  }
  return out;
}

export type ExtractedBlockKind =
  | "heading"
  | "paragraph"
  | "list-item"
  | "form-field"
  | "nav-link";

export interface ExtractedBlock {
  readonly kind: ExtractedBlockKind;
  readonly text: string;
  readonly level?: number;
  readonly href?: string;
  readonly fieldKind?: string;
}

/**
 * Project a ReferenceDigest's content tree into a flat ExtractedBlock list the
 * digest carries on each `perPagePlan` entry. Deterministic — no LLM.
 */
export function extractPageContent(digest: ReferenceDigest): ExtractedBlock[] {
  const blocks: ExtractedBlock[] = [];
  for (const h of digest.signals.content.headings) {
    if (h.text.trim()) {
      blocks.push({ kind: "heading", text: h.text.trim(), level: h.level });
    }
  }
  for (const link of digest.signals.content.navLinks) {
    if (link.text.trim()) {
      blocks.push({ kind: "nav-link", text: link.text.trim(), href: link.href });
    }
  }
  for (const field of digest.signals.content.formFields) {
    blocks.push({ kind: "form-field", text: field.name, fieldKind: field.kind });
  }
  return blocks;
}

/**
 * Suggest a top-down ordered list of module types for a page given its content
 * signals. Pure heuristic, no LLM. The AI uses this as a hint when walking the
 * digest's `perPagePlan` — it may follow or deviate.
 *
 * Heuristic rules (top-down):
 *   - multiple nav links → `header` first
 *   - heroDetected → `hero` second (or first if no header)
 *   - list groups present → `services-grid` mid-page
 *   - form fields present → `contactForm` near bottom
 *   - any page → `text-block` between content sections
 *   - footer always last
 */
export function inferSuggestedModuleTypes(digest: ReferenceDigest): string[] {
  const out: string[] = [];
  const content = digest.signals.content;
  if (content.navLinks.length >= 2) out.push("header");
  if (digest.signals.imagery.heroDetected) out.push("hero");
  if (content.headings.some((h) => h.level === 2)) out.push("text-block");
  if (content.listGroupCount >= 1) out.push("services-grid");
  if (content.formFields.length >= 1) out.push("contactForm");
  out.push("footer");
  return out;
}

/**
 * REQ-33 — text-asset reference for body copy. Same shape as the framework's
 * `AssetRef { kind: 'text' }` so the AI can drop it verbatim into
 * `set_module_content` for any markdown content field.
 */
export interface TranscriptionDigestCopyRef {
  readonly id: string;
  readonly src: string;
  readonly alt?: string;
  readonly kind: "text";
}

export interface TranscriptionDigestPerPage {
  readonly url: string;
  readonly slug: string;
  readonly title: string;
  readonly screenshotKey: string;
  /**
   * REQ-49 — stable URL the chat AI can pass to Anthropic vision (or just
   * render in the operator UI) without having to know the `/assets/`
   * routing convention. Empty string when no desktop screenshot was
   * captured for this page (Layer 2 not run / driver dropped the
   * viewport).
   */
  readonly screenshotUrl: string;
  readonly extractedContent: ExtractedBlock[];
  readonly suggestedModuleTypes: string[];
  /**
   * REQ-33 — body copy AssetRef (kind: 'text') the AI passes directly into
   * `set_module_content` for markdown body fields. Populated by
   * `transcribe_site` Stage 5 when the captured body markdown is large or
   * structured enough to warrant a separate `.md` file in R2. Mutually
   * exclusive with `inlineMarkdown` — small single-paragraph captures use
   * `inlineMarkdown` instead.
   */
  readonly copy?: TranscriptionDigestCopyRef;
  /**
   * REQ-33 — short single-paragraph body copy. Populated by Stage 5 when the
   * captured markdown is under the inline threshold (200 chars,
   * single-paragraph). The AI passes this string verbatim to
   * `set_module_content` instead of a `copy` AssetRef.
   */
  readonly inlineMarkdown?: string;
}

export interface TranscriptionDigestAssetRef {
  readonly id: string;
  readonly src: string;
  readonly alt: string;
}

export interface TranscriptionDigestAssetEntry {
  readonly sourceUrl: string;
  readonly r2Key: string;
  readonly kind: "img" | "background" | "video" | "font";
  readonly altText?: string;
  readonly dimensions?: { readonly width: number; readonly height: number };
  /**
   * Pre-composed AssetRef object the AI should pass directly to
   * `set_module_content` for any image content field. Removes ambiguity about
   * how to compose `{ id, src, alt }` from `r2Key` + `altText` and prevents the
   * how-to doc drifting back into telling the AI to pass a bare string (which
   * the framework's `asset-ref` validator and renderer both reject). See BUG-5.
   */
  readonly assetRef: TranscriptionDigestAssetRef;
}

export interface TranscriptionDigestMirrorSummary {
  readonly mirrored: number;
  readonly failed: number;
  readonly failures: ReadonlyArray<{ readonly url: string; readonly reason: string }>;
}

export interface TranscriptionDigest {
  readonly siteId: string;
  readonly sourceUrl: string;
  readonly capturedAt: string;
  readonly themeTokens: ThemeTokens;
  readonly perPagePlan: ReadonlyArray<TranscriptionDigestPerPage>;
  readonly assetInventory: ReadonlyArray<TranscriptionDigestAssetEntry>;
  readonly mirrorSummary: TranscriptionDigestMirrorSummary;
}

/**
 * Derive a 1stcontact-valid slug from a URL path. Returns `/` for root, or a
 * leading-slash kebab-case path segment (e.g. `/menu`, `/about-us`).
 */
export function slugFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, "");
    if (!path) return "/";
    const last = path.split("/").filter(Boolean).pop();
    if (!last) return "/";
    const cleaned = last
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return cleaned ? `/${cleaned}` : "/";
  } catch {
    return "/";
  }
}

/**
 * Derive a human-readable page title from a digest. Prefers H1; falls back to
 * a slug-derived title; finally the hostname.
 */
export function titleFromDigest(digest: ReferenceDigest): string {
  const h1 = digest.signals.content.headings.find((h) => h.level === 1);
  if (h1 && h1.text.trim()) return h1.text.trim();
  try {
    const u = new URL(digest.sourceUrl);
    const last = u.pathname.replace(/\/$/, "").split("/").filter(Boolean).pop();
    if (last) {
      return last
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return u.hostname;
  } catch {
    return "Untitled";
  }
}

export interface BuildTranscriptionDigestArgs {
  readonly siteId: string;
  readonly homeDigest: ReferenceDigest;
  readonly additionalPageDigests: ReadonlyArray<ReferenceDigest>;
  readonly urlToR2Key: ReadonlyMap<string, string>;
  readonly mirrorSummary: TranscriptionDigestMirrorSummary;
  readonly capturedAt: string;
  /**
   * REQ-33 — Stage-5 copy overlay, keyed by source URL. When present, the
   * per-page entry for that URL is augmented with `copy` and/or
   * `inlineMarkdown` fields.
   */
  readonly pageCopyByUrl?: ReadonlyMap<string, PageCopyResult>;
}

export interface PageCopyResult {
  readonly copy?: TranscriptionDigestCopyRef;
  readonly inlineMarkdown?: string;
}

const INLINE_MARKDOWN_MAX_CHARS = 200;

/**
 * Decide whether a captured markdown block should be inlined or written to a
 * file. The threshold for inline: under 200 characters AND contains no block
 * structure (no blank-line paragraph break, no heading, no list, no
 * blockquote). Anything else is considered "structured" and goes to a file.
 *
 * Used by `transcribe_site` Stage 5 (REQ-33).
 */
export function classifyCapturedMarkdown(markdown: string): "inline" | "file" {
  const trimmed = markdown.trim();
  if (trimmed.length === 0) return "inline";
  if (trimmed.length >= INLINE_MARKDOWN_MAX_CHARS) return "file";
  if (/\n\n/.test(trimmed)) return "file";
  if (/^\s*#{1,6}\s+/m.test(trimmed)) return "file";
  if (/^\s*[-*]\s+/m.test(trimmed)) return "file";
  if (/^\s*\d+\.\s+/m.test(trimmed)) return "file";
  if (/^\s*>\s?/m.test(trimmed)) return "file";
  return "inline";
}

/**
 * Build a TranscriptionDigest from the home page's ReferenceDigest, any
 * additional cached per-page digests, and the asset-mirror result. Pure
 * function — no IO, no LLM.
 */
export function buildTranscriptionDigest(
  args: BuildTranscriptionDigestArgs,
): TranscriptionDigest {
  const homePatch = deriveThemeTokens(args.homeDigest);
  const themeTokens = applyTokenPatch(homePatch);

  const pageDigests = [args.homeDigest, ...args.additionalPageDigests];
  const perPagePlan: TranscriptionDigestPerPage[] = pageDigests.map((d) => {
    const copyEntry = args.pageCopyByUrl?.get(d.sourceUrl);
    const screenshotKey = d.screenshotKeys.desktop ?? "";
    const base: TranscriptionDigestPerPage = {
      url: d.sourceUrl,
      slug: slugFromUrl(d.sourceUrl),
      title: titleFromDigest(d),
      screenshotKey,
      screenshotUrl: screenshotKey ? `/assets/${screenshotKey}` : "",
      extractedContent: extractPageContent(d),
      suggestedModuleTypes: inferSuggestedModuleTypes(d),
    };
    if (copyEntry?.copy) {
      (base as Mutable<TranscriptionDigestPerPage>).copy = copyEntry.copy;
    }
    if (copyEntry?.inlineMarkdown !== undefined) {
      (base as Mutable<TranscriptionDigestPerPage>).inlineMarkdown =
        copyEntry.inlineMarkdown;
    }
    return base;
  });

  const assetInventory: TranscriptionDigestAssetEntry[] = [];
  const seen = new Set<string>();
  for (const d of pageDigests) {
    for (const a of d.signals.assetInventory) {
      if (seen.has(a.url)) continue;
      const r2Key = args.urlToR2Key.get(a.url);
      if (!r2Key) continue;
      seen.add(a.url);
      const entry: TranscriptionDigestAssetEntry = {
        sourceUrl: a.url,
        r2Key,
        kind: a.kind,
        ...(a.alt ? { altText: a.alt } : {}),
        ...(typeof a.width === "number" && typeof a.height === "number"
          ? { dimensions: { width: a.width, height: a.height } }
          : {}),
        assetRef: {
          id: r2Key,
          src: `/assets/${r2Key}`,
          alt: a.alt ?? "",
        },
      };
      assetInventory.push(entry);
    }
  }

  return {
    siteId: args.siteId,
    sourceUrl: args.homeDigest.sourceUrl,
    capturedAt: args.capturedAt,
    themeTokens,
    perPagePlan,
    assetInventory,
    mirrorSummary: args.mirrorSummary,
  };
}

/**
 * Walk a per-page digest's `assetInventory` and return the deduplicated set of
 * external asset URLs that should be mirrored to R2.
 *
 * This is the input to `mirrorAssetBatchToR2`. For multi-page convert, the
 * union across all per-page digests is mirrored once.
 */
export function collectReferencedAssetUrls(
  digests: ReadonlyArray<ReferenceDigest>,
): ReadonlyArray<string> {
  const seen = new Set<string>();
  for (const d of digests) {
    for (const a of d.signals.assetInventory) {
      if (a.url) seen.add(a.url);
    }
  }
  return [...seen];
}

/**
 * Map mirror failures from the batch result into a TranscriptionDigest's
 * `mirrorSummary.failures` shape (drops detail field). Convenience helper.
 */
export function summariseMirrorFailures(
  failures: ReadonlyArray<{ readonly url: string; readonly reason: string }>,
): ReadonlyArray<{ readonly url: string; readonly reason: string }> {
  return failures.map((f) => ({ url: f.url, reason: f.reason }));
}

/**
 * Rewrite a single string URL to its R2-keyed equivalent when present in the
 * mapping. Used by chat-side code when previewing the digest's assets. Kept
 * exported because tests in [[REQ-28]] (collect_and_rewrite_asset_refs) cover
 * it as a pure helper.
 */
export function rewriteAssetRefs(
  urls: ReadonlyArray<string>,
  urlToR2Key: ReadonlyMap<string, string>,
  assetUrlPrefix = "/assets/",
): ReadonlyArray<string> {
  return urls.map((u) => {
    const k = urlToR2Key.get(u);
    return k ? `${assetUrlPrefix}${k}` : u;
  });
}

function normalizeHex(s: string): string {
  const trimmed = s.trim();
  return trimmed.startsWith("#") ? trimmed.toLowerCase() : `#${trimmed.toLowerCase()}`;
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
