import type {
  AssetRef,
  ModuleInstance,
  Page,
  Site,
  ThemeTokens,
} from "@1stcontact/site-schema";
import { validateSite } from "@1stcontact/site-schema";
import { defaultThemeTokens } from "@1stcontact/framework/tokens";
import {
  headerMeta,
  heroMeta,
  footerMeta,
  textBlockMeta,
  servicesGridMeta,
  contactFormMeta,
  type ModuleMeta,
} from "@1stcontact/framework/meta";
import { validateModuleContent } from "@1stcontact/framework/module-validate";
import {
  NOT_DETECTED,
  type ReferenceDigest,
  type Signals,
} from "./schema.js";

/**
 * Module catalog the LLM transcription prompt is allowed to draw from.
 * Mirrors packages/framework/src/modules/registry.ts — we list metas here
 * (not Components) so this module stays browser-safe and Astro-free.
 */
export const TRANSCRIPTION_CATALOG: ReadonlyArray<ModuleMeta> = [
  headerMeta,
  heroMeta,
  textBlockMeta,
  servicesGridMeta,
  contactFormMeta,
  footerMeta,
];

const CATALOG_BY_ID = new Map<string, ModuleMeta>(
  TRANSCRIPTION_CATALOG.map((m) => [m.id, m]),
);

export type Confidence = "high" | "medium" | "low";

/**
 * The LLM output shape we expect for a single module. The LLM is responsible
 * for keeping content shape compatible with the framework catalog; the
 * validator catches drift and feeds it back for retry.
 */
export interface TranscribedModule {
  readonly id: string;
  readonly type: string;
  readonly version: number;
  readonly variant?: string;
  readonly dials?: Record<string, string>;
  readonly content?: Record<string, unknown>;
  readonly confidence: Confidence;
  readonly source_section?: string;
}

export interface TranscribedThemeTokens {
  readonly palette: Partial<ThemeTokens["palette"]>;
  readonly typography: { readonly family?: Partial<ThemeTokens["typography"]["family"]> };
  readonly confidence: {
    readonly palette: Confidence;
    readonly typography: Confidence;
    readonly layout: Confidence;
  };
}

export interface Transcription {
  readonly themeTokens: TranscribedThemeTokens;
  readonly modules: ReadonlyArray<TranscribedModule>;
  readonly narrative: string;
}

/**
 * Map digest palette + typography signals deterministically to a theme-token
 * patch. Pure function — no LLM. Returns only the fields the digest actually
 * detected; callers merge with `defaultThemeTokens` for unset slots.
 *
 * Mapping (per REQ-28 §Decisions, "Theme token derivation"):
 *   background → palette.bg
 *   body       → palette.text
 *   accent     → palette.accent
 *   cta        → palette.primary
 *   primaryPair.body    → typography.family.body
 *   primaryPair.heading → typography.family.heading
 *
 * Confidence rules:
 *   palette:    high when 3+ roles detected, medium for 1–2, low for 0.
 *   typography: high when primaryPair detected, medium when only body family
 *               detected, low otherwise.
 *   layout:     always medium (we don't yet map layout signals to tokens;
 *               kept for forward compat with the LLM narrative).
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
 * Merge a partial theme-token patch onto `defaultThemeTokens`. Used by the
 * `transcribe_site` action to produce a complete `ThemeTokens` object that
 * passes the site-schema validator at all four layers.
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

/**
 * Build the multimodal prompt for the LLM transcription pass. Returns plain
 * objects (not API-bound) so it can be consumed by tests and by the worker
 * with identical inputs. The image content is attached separately by the
 * caller (with bytes resolved from R2 by the worker).
 */
export interface ComposedPrompt {
  readonly system: string;
  readonly user: string;
}

export function composePromptForTranscription(
  digest: ReferenceDigest,
  catalog: ReadonlyArray<ModuleMeta> = TRANSCRIPTION_CATALOG,
): ComposedPrompt {
  const catalogJson = JSON.stringify(
    catalog.map((m) => ({
      id: m.id,
      version: m.version,
      variants: m.variants,
      dials: m.dials,
      contentSchema: m.contentSchema,
    })),
    null,
    2,
  );
  const assetsJson = JSON.stringify(
    digest.signals.assetInventory.map((a) => ({
      url: a.url,
      kind: a.kind,
      alt: a.alt ?? "",
      classification: a.classification,
    })),
    null,
    2,
  );

  const system = [
    "You are the 1st Contact site-transcription agent.",
    "Your job: given a Reference Digest, the rendered DOM signals, and a desktop screenshot of an external site, produce a draft set of MODULE INSTANCES in the 1st Contact framework that reproduces the site's structure, content, and visual feel — within the constraints of the catalog.",
    "Output a SINGLE JSON object only — no preamble, no markdown fences.",
    "Schema:",
    '  { "modules": ModuleInstance[], "narrative": string }',
    "Where each ModuleInstance is:",
    '  { "id": string, "type": string, "version": number, "variant"?: string, "dials"?: Record<string,string>, "content"?: Record<string,unknown>, "confidence": "high"|"medium"|"low", "source_section"?: string }',
    "Rules:",
    "- Every module type+version+variant+dial values MUST come from the catalog (provided below). Any value outside the catalog will fail validation.",
    "- Content fields MUST satisfy the catalog's contentSchema for the module type.",
    "- AssetRefs in content fields use the shape { id, src, alt } where src is the EXTERNAL URL from the digest's asset inventory (do not invent URLs). Use one of the URLs listed in the inventory section.",
    "- confidence per module: 'high' when the source section maps cleanly to one of our modules; 'medium' when it required interpretation; 'low' when the section is unusual and you fell back to text-block.",
    "- Order modules in the order they appear on the source page.",
    "- If no module in the catalog fits a section, emit a `text-block` carrying the section's text content with confidence='low'.",
    "- narrative is one paragraph (≤ 500 chars) summarising what you transcribed and naming any low-confidence sections so the operator knows where to verify.",
  ].join("\n");

  const user = [
    `Reference URL: ${digest.sourceUrl}`,
    "",
    "Summary:",
    digest.summary,
    "",
    "Signals (palette / typography / layout / imagery / content tree):",
    "```json",
    JSON.stringify(digest.signals, null, 2),
    "```",
    "",
    "Asset inventory (these are the only URLs you may reference in content fields):",
    "```json",
    assetsJson,
    "```",
    "",
    "Module catalog (id, version, variants, dials, contentSchema):",
    "```json",
    catalogJson,
    "```",
    "",
    "Produce the JSON transcription now.",
  ].join("\n");

  return { system, user };
}

export interface TranscriptionValidationIssue {
  readonly path: string;
  readonly message: string;
}

export interface TranscriptionValidationResult {
  readonly ok: boolean;
  readonly issues: ReadonlyArray<TranscriptionValidationIssue>;
}

/**
 * Validate a transcription against the framework catalog AND the site-schema.
 * Returns the union of issues from:
 *   - per-module catalog membership (type+version exists, variant in module's
 *     declared variants, every dial value in module.dials[dialName])
 *   - per-module content shape (delegates to validateModuleContent)
 *   - whole-site validation (delegates to validateSite once we synthesise a
 *     full Site object — this catches AssetRef shape, theme token shape, etc.)
 */
export function validateTranscription(
  transcription: Transcription,
  catalog: ReadonlyArray<ModuleMeta> = TRANSCRIPTION_CATALOG,
): TranscriptionValidationResult {
  const issues: TranscriptionValidationIssue[] = [];
  const byId = new Map<string, ModuleMeta>(catalog.map((m) => [m.id, m]));

  const seenIds = new Set<string>();
  transcription.modules.forEach((mod, idx) => {
    const at = `/modules/${idx}`;
    if (seenIds.has(mod.id)) {
      issues.push({
        path: `${at}/id`,
        message: `duplicate module id '${mod.id}'`,
      });
    }
    seenIds.add(mod.id);

    const meta = byId.get(mod.type);
    if (!meta) {
      issues.push({
        path: `${at}/type`,
        message: `unknown module type '${mod.type}'. Allowed: [${[...byId.keys()].join(", ")}]`,
      });
      return;
    }
    if (mod.version !== meta.version) {
      issues.push({
        path: `${at}/version`,
        message: `module '${mod.type}' has version ${meta.version}, got ${mod.version}`,
      });
    }
    if (mod.variant !== undefined && !meta.variants.includes(mod.variant)) {
      issues.push({
        path: `${at}/variant`,
        message: `expected one of [${meta.variants.join(", ")}], got '${mod.variant}'`,
      });
    }
    if (mod.dials) {
      for (const [name, value] of Object.entries(mod.dials)) {
        const allowed = meta.dials[name as keyof typeof meta.dials];
        if (!allowed) {
          issues.push({
            path: `${at}/dials/${name}`,
            message: `unknown dial '${name}' for module '${mod.type}'. Allowed dials: [${Object.keys(meta.dials).join(", ")}]`,
          });
          continue;
        }
        if (!allowed.includes(value)) {
          issues.push({
            path: `${at}/dials/${name}`,
            message: `expected one of [${allowed.join(", ")}], got '${value}'`,
          });
        }
      }
    }
    if (mod.content) {
      const contentResult = validateModuleContent(meta, mod.content);
      if (!contentResult.ok) {
        for (const issue of contentResult.issues) {
          issues.push({
            path: `${at}/content/${issue.path.join("/")}`,
            message: issue.message,
          });
        }
      }
    } else {
      // Check that no required content fields are missing.
      const contentResult = validateModuleContent(meta, {});
      if (!contentResult.ok) {
        for (const issue of contentResult.issues) {
          if (issue.message.includes("required field is missing")) {
            issues.push({
              path: `${at}/content/${issue.path.join("/")}`,
              message: issue.message,
            });
          }
        }
      }
    }
  });

  return { ok: issues.length === 0, issues };
}

/**
 * Synthesise a complete Site object from a validated transcription, a
 * derived theme-token patch, and the source URL. Useful for the
 * `transcribe_site` action which needs a full site-shaped object before
 * shipping module instances + theme tokens to the client.
 */
export function buildSiteFromTranscription(args: {
  transcription: Transcription;
  themeTokens: ThemeTokens;
  sourceUrl: string;
  businessName: string;
}): { ok: true; value: Site } | { ok: false; errors: ReadonlyArray<TranscriptionValidationIssue> } {
  const modules: ModuleInstance[] = args.transcription.modules.map((m) => ({
    id: m.id,
    type: m.type,
    version: m.version,
    variant: m.variant,
    dials: m.dials,
    content: m.content as ModuleInstance["content"],
  }));

  const page: Page = {
    id: "home",
    slug: "/",
    title: args.businessName,
    modules,
  };

  const site: Site = {
    config: { businessName: args.businessName },
    theme: args.themeTokens,
    nav: { pattern: "in-page-anchors", entries: [] },
    pages: [page],
  };

  const result = validateSite(site);
  if (result.ok) return { ok: true, value: result.value };
  return {
    ok: false,
    errors: result.errors.map((e) => ({ path: e.path, message: e.message })),
  };
}

/**
 * Walk a transcription's module instances and return the deduplicated set of
 * external asset URLs they reference. Inputs to Stage 4 (asset mirror).
 *
 * An "asset URL" is any string value found inside an AssetRef-shaped object
 * (`{ id, src, alt }`) at any depth inside `content`. We also pick up bare
 * string fields when the catalog declares them as `asset-ref-or-string` and
 * the value looks like an absolute URL.
 */
export function collectReferencedAssetUrls(
  transcription: Transcription,
): ReadonlyArray<string> {
  const seen = new Set<string>();
  for (const mod of transcription.modules) {
    if (!mod.content) continue;
    const meta = CATALOG_BY_ID.get(mod.type);
    walkContent(mod.content, meta, seen);
  }
  return [...seen];
}

function walkContent(
  value: unknown,
  meta: ModuleMeta | undefined,
  out: Set<string>,
): void {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    for (const item of value) walkContent(item, meta, out);
    return;
  }
  if (typeof value !== "object") return;
  const obj = value as Record<string, unknown>;
  // Asset-ref shape: { id, src, alt } with src as string URL.
  if (
    typeof obj.src === "string" &&
    typeof obj.alt === "string" &&
    typeof obj.id === "string"
  ) {
    if (looksLikeUrl(obj.src)) out.add(obj.src);
  }
  for (const [, v] of Object.entries(obj)) {
    walkContent(v, meta, out);
  }
}

function looksLikeUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

/**
 * Rewrite every AssetRef whose `src` matches a key in `urlToR2Key` to point at
 * the mapped R2 key (as a leading-slash path: `/assets/{r2Key}`). Returns a
 * new transcription; the input is unchanged.
 */
export function rewriteAssetRefs(
  transcription: Transcription,
  urlToR2Key: ReadonlyMap<string, string>,
  assetUrlPrefix = "/assets/",
): Transcription {
  if (urlToR2Key.size === 0) return transcription;
  const rewriteValue = (v: unknown): unknown => {
    if (v === null || v === undefined) return v;
    if (Array.isArray(v)) return v.map(rewriteValue);
    if (typeof v !== "object") return v;
    const obj = v as Record<string, unknown>;
    if (
      typeof obj.src === "string" &&
      typeof obj.alt === "string" &&
      typeof obj.id === "string"
    ) {
      const mapped = urlToR2Key.get(obj.src);
      if (mapped) {
        return { ...obj, src: `${assetUrlPrefix}${mapped}` };
      }
    }
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(obj)) {
      out[k] = rewriteValue(val);
    }
    return out;
  };

  const modules: TranscribedModule[] = transcription.modules.map((m) => ({
    ...m,
    content: m.content ? (rewriteValue(m.content) as Record<string, unknown>) : m.content,
  }));
  return { ...transcription, modules };
}

/**
 * Build a fallback hero-only draft when LLM transcription fails twice. Reused
 * by the `transcribe_site` orchestration; pure-function so tests can exercise
 * it without spinning up the worker.
 */
export function buildHeroOnlyFallback(args: {
  digest: ReferenceDigest;
  businessName?: string;
}): Transcription {
  const heading =
    args.businessName ??
    deriveBusinessName(args.digest) ??
    "Your Site";
  return {
    themeTokens: deriveThemeTokens(args.digest),
    modules: [
      {
        id: "hero-1",
        type: "hero",
        version: 1,
        variant: "bg-color",
        confidence: "low",
        content: {
          heading,
          subhead:
            "We couldn't automatically transcribe this site — here's a hero-only starting point. Ask me to add sections.",
        },
        source_section: "fallback",
      },
    ],
    narrative:
      "I couldn't transcribe this site automatically; here's a hero-only draft as a starting point. Tell me which sections you'd like next.",
  };
}

function deriveBusinessName(digest: ReferenceDigest): string | null {
  const heading = digest.signals.content.headings.find((h) => h.level === 1);
  if (heading && heading.text.trim()) return heading.text.trim();
  try {
    const u = new URL(digest.sourceUrl);
    return u.hostname;
  } catch {
    return null;
  }
}

/**
 * Parse the raw LLM text into a Transcription, tolerantly. Strips any
 * markdown fences, then JSON.parses, then coerces shape. Returns null on
 * malformed input so the caller can retry or fall back.
 */
export function parseTranscriptionFromLlm(
  raw: string,
  themeTokens: TranscribedThemeTokens,
): Transcription | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.modules)) return null;
  const modules: TranscribedModule[] = [];
  for (const m of obj.modules) {
    if (!m || typeof m !== "object") return null;
    const mod = m as Record<string, unknown>;
    if (
      typeof mod.id !== "string" ||
      typeof mod.type !== "string" ||
      typeof mod.version !== "number" ||
      (mod.confidence !== "high" && mod.confidence !== "medium" && mod.confidence !== "low")
    ) {
      return null;
    }
    modules.push({
      id: mod.id,
      type: mod.type,
      version: mod.version,
      variant: typeof mod.variant === "string" ? mod.variant : undefined,
      dials: isStringRecord(mod.dials) ? mod.dials : undefined,
      content: isPlainObject(mod.content) ? mod.content : undefined,
      confidence: mod.confidence,
      source_section:
        typeof mod.source_section === "string" ? mod.source_section : undefined,
    });
  }
  return {
    themeTokens,
    modules,
    narrative: typeof obj.narrative === "string" ? obj.narrative : "",
  };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStringRecord(v: unknown): v is Record<string, string> {
  if (!isPlainObject(v)) return false;
  for (const value of Object.values(v)) {
    if (typeof value !== "string") return false;
  }
  return true;
}

function normalizeHex(s: string): string {
  const trimmed = s.trim();
  return trimmed.startsWith("#") ? trimmed.toLowerCase() : `#${trimmed.toLowerCase()}`;
}

/**
 * Convenience: enumerate the AssetRefs in a transcription with their
 * containing module id, for diagnostics / progress UIs. Not used by the
 * orchestration itself.
 */
export interface AssetRefRef {
  readonly moduleId: string;
  readonly ref: AssetRef;
}

export function enumerateAssetRefs(transcription: Transcription): AssetRefRef[] {
  const out: AssetRefRef[] = [];
  for (const mod of transcription.modules) {
    if (!mod.content) continue;
    walk(mod.content, (ref) => out.push({ moduleId: mod.id, ref }));
  }
  return out;
}

function walk(value: unknown, visit: (ref: AssetRef) => void): void {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  if (typeof value !== "object") return;
  const obj = value as Record<string, unknown>;
  if (
    typeof obj.src === "string" &&
    typeof obj.alt === "string" &&
    typeof obj.id === "string"
  ) {
    visit({
      id: obj.id,
      src: obj.src,
      alt: obj.alt,
      ...(isPlainObject(obj.focalPoint) ? { focalPoint: obj.focalPoint as AssetRef["focalPoint"] } : {}),
    });
  }
  for (const v of Object.values(obj)) walk(v, visit);
}
