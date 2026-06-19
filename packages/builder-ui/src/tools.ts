import type {
  ModuleInstance,
  Page,
  Site,
} from "@1stcontact/site-schema";
import { validateSite } from "@1stcontact/site-schema";
import { findCatalogEntry, type FrameworkCatalog } from "./catalog.js";

export type ToolName =
  | "set_module_content"
  | "set_module_dial"
  | "set_module_variant"
  | "add_module"
  | "remove_module"
  | "reorder_modules"
  | "set_theme_token"
  | "set_site_config"
  | "add_page"
  | "remove_page"
  | "reorder_pages";

export interface ToolCall {
  readonly name: ToolName;
  readonly input: Record<string, unknown>;
}

export type ApplyResult =
  | { readonly ok: true; readonly next: Site }
  | { readonly ok: false; readonly error: ToolApplyError };

export interface ToolApplyError {
  readonly tool: ToolName;
  readonly path?: string;
  readonly expected?: string | readonly string[];
  readonly got?: unknown;
  readonly message: string;
}

/**
 * Apply a tool call to a site definition. Layer 1 of the four-layer validator
 * (DOC-7 §6.5). The pipeline is:
 *   1. Pre-check catalog membership for finite-enum fields (variant/dial/type).
 *   2. Build the candidate next-state.
 *   3. Hand it to validateSite() (schema check + cross-refs).
 *   4. Return structured error on failure (so the AI can self-correct).
 */
export function applyToolCall(
  site: Site,
  catalog: FrameworkCatalog,
  call: ToolCall,
): ApplyResult {
  switch (call.name) {
    case "set_module_content":
      return applySetModuleContent(site, call);
    case "set_module_dial":
      return applySetModuleDial(site, catalog, call);
    case "set_module_variant":
      return applySetModuleVariant(site, catalog, call);
    case "add_module":
      return applyAddModule(site, catalog, call);
    case "remove_module":
      return applyRemoveModule(site, call);
    case "reorder_modules":
      return applyReorderModules(site, call);
    case "set_theme_token":
      return applySetThemeToken(site, catalog, call);
    case "set_site_config":
      return applySetSiteConfig(site, call);
    case "add_page":
      return applyAddPage(site, call);
    case "remove_page":
      return applyRemovePage(site, call);
    case "reorder_pages":
      return applyReorderPages(site, call);
    default:
      return failure({
        tool: call.name,
        message: `unknown tool: ${String(call.name)}`,
      });
  }
}

function applySetModuleContent(site: Site, call: ToolCall): ApplyResult {
  const { instance_id, field, value } = call.input as {
    instance_id?: unknown;
    field?: unknown;
    value?: unknown;
  };
  if (typeof instance_id !== "string" || typeof field !== "string") {
    return failure({
      tool: call.name,
      message: "instance_id and field must be strings",
    });
  }
  return mutateModule(site, instance_id, (m) => ({
    ...m,
    content: { ...(m.content ?? {}), [field]: value as never },
  }), call.name);
}

function applySetModuleDial(
  site: Site,
  catalog: FrameworkCatalog,
  call: ToolCall,
): ApplyResult {
  const { instance_id, dial, value } = call.input as {
    instance_id?: unknown;
    dial?: unknown;
    value?: unknown;
  };
  if (
    typeof instance_id !== "string" ||
    typeof dial !== "string" ||
    typeof value !== "string"
  ) {
    return failure({
      tool: call.name,
      message: "instance_id, dial and value must be strings",
    });
  }
  const located = findInstance(site, instance_id);
  if (!located) {
    return failure({
      tool: call.name,
      message: `no module with id '${instance_id}'`,
    });
  }
  const entry = findCatalogEntry(catalog, located.instance.type, located.instance.version);
  if (!entry) {
    return failure({
      tool: call.name,
      message: `module type ${located.instance.type}@v${located.instance.version} not in catalog`,
    });
  }
  const allowed = entry.dials[dial];
  if (!allowed) {
    return failure({
      tool: call.name,
      path: `modules[?id=${instance_id}].dials.${dial}`,
      expected: Object.keys(entry.dials),
      got: dial,
      message: `dial '${dial}' is not declared on ${entry.id}@v${entry.version}`,
    });
  }
  if (!allowed.includes(value)) {
    return failure({
      tool: call.name,
      path: `modules[?id=${instance_id}].dials.${dial}`,
      expected: allowed,
      got: value,
      message: `dial '${dial}' value '${value}' is not in [${allowed.join(", ")}]`,
    });
  }
  return mutateModule(site, instance_id, (m) => ({
    ...m,
    dials: { ...(m.dials ?? {}), [dial]: value },
  }), call.name);
}

function applySetModuleVariant(
  site: Site,
  catalog: FrameworkCatalog,
  call: ToolCall,
): ApplyResult {
  const { instance_id, variant } = call.input as {
    instance_id?: unknown;
    variant?: unknown;
  };
  if (typeof instance_id !== "string" || typeof variant !== "string") {
    return failure({
      tool: call.name,
      message: "instance_id and variant must be strings",
    });
  }
  const located = findInstance(site, instance_id);
  if (!located) {
    return failure({
      tool: call.name,
      message: `no module with id '${instance_id}'`,
    });
  }
  const entry = findCatalogEntry(catalog, located.instance.type, located.instance.version);
  if (!entry) {
    return failure({
      tool: call.name,
      message: `module type ${located.instance.type}@v${located.instance.version} not in catalog`,
    });
  }
  if (!entry.variants.includes(variant)) {
    return failure({
      tool: call.name,
      path: `modules[?id=${instance_id}].variant`,
      expected: entry.variants,
      got: variant,
      message: `variant '${variant}' is not declared on ${entry.id}@v${entry.version}`,
    });
  }
  return mutateModule(site, instance_id, (m) => ({ ...m, variant }), call.name);
}

function applyAddModule(
  site: Site,
  catalog: FrameworkCatalog,
  call: ToolCall,
): ApplyResult {
  const { page_id, type, version, after_instance_id, content, variant, dials, id } =
    call.input as {
      page_id?: unknown;
      type?: unknown;
      version?: unknown;
      after_instance_id?: unknown;
      content?: unknown;
      variant?: unknown;
      dials?: unknown;
      id?: unknown;
    };
  if (typeof page_id !== "string" || typeof type !== "string" || typeof version !== "number") {
    return failure({
      tool: call.name,
      message: "page_id, type, version are required (page_id/type strings; version number)",
    });
  }
  const entry = findCatalogEntry(catalog, type, version);
  if (!entry) {
    return failure({
      tool: call.name,
      message: `module type ${type}@v${version} not in catalog`,
    });
  }
  const newId =
    typeof id === "string" && id.length > 0
      ? id
      : `${type}-${Math.random().toString(36).slice(2, 8)}`;
  const newInstance: ModuleInstance = {
    id: newId,
    type,
    version,
    ...(typeof variant === "string" ? { variant } : {}),
    ...(isPlainObject(dials) ? { dials: dials as Record<string, string> } : {}),
    ...(isPlainObject(content) ? { content: content as Record<string, never> } : {}),
  };
  const pageIdx = site.pages.findIndex((p) => p.id === page_id);
  if (pageIdx < 0) {
    return failure({
      tool: call.name,
      message: `no page with id '${page_id}'`,
    });
  }
  const page = site.pages[pageIdx]!;
  let insertAt = page.modules.length;
  if (typeof after_instance_id === "string") {
    const afterIdx = page.modules.findIndex((m) => m.id === after_instance_id);
    if (afterIdx < 0) {
      return failure({
        tool: call.name,
        message: `after_instance_id '${after_instance_id}' not found on page '${page_id}'`,
      });
    }
    insertAt = afterIdx + 1;
  }
  const nextModules = [...page.modules];
  nextModules.splice(insertAt, 0, newInstance);
  const nextPages = site.pages.map((p, i) =>
    i === pageIdx ? { ...p, modules: nextModules } : p,
  );
  return runValidator({ ...site, pages: nextPages }, call.name);
}

function applyRemoveModule(site: Site, call: ToolCall): ApplyResult {
  const { instance_id } = call.input as { instance_id?: unknown };
  if (typeof instance_id !== "string") {
    return failure({
      tool: call.name,
      message: "instance_id must be a string",
    });
  }
  let touched = false;
  const nextPages = site.pages.map((p) => {
    if (!p.modules.some((m) => m.id === instance_id)) return p;
    touched = true;
    return { ...p, modules: p.modules.filter((m) => m.id !== instance_id) };
  });
  if (!touched) {
    return failure({
      tool: call.name,
      message: `no module with id '${instance_id}'`,
    });
  }
  return runValidator({ ...site, pages: nextPages }, call.name);
}

function applyReorderModules(site: Site, call: ToolCall): ApplyResult {
  const { page_id, instance_ids } = call.input as {
    page_id?: unknown;
    instance_ids?: unknown;
  };
  if (typeof page_id !== "string" || !Array.isArray(instance_ids)) {
    return failure({
      tool: call.name,
      message: "page_id (string) and instance_ids (array) are required",
    });
  }
  const pageIdx = site.pages.findIndex((p) => p.id === page_id);
  if (pageIdx < 0) {
    return failure({
      tool: call.name,
      message: `no page with id '${page_id}'`,
    });
  }
  const page = site.pages[pageIdx]!;
  const ids = instance_ids as unknown[];
  if (ids.length !== page.modules.length || ids.some((id) => typeof id !== "string")) {
    return failure({
      tool: call.name,
      message: `instance_ids must list every module on the page exactly once (got ${ids.length}, expected ${page.modules.length})`,
    });
  }
  const byId = new Map(page.modules.map((m) => [m.id, m]));
  const nextModules: ModuleInstance[] = [];
  for (const id of ids as string[]) {
    const m = byId.get(id);
    if (!m) {
      return failure({
        tool: call.name,
        message: `instance_id '${id}' not on page '${page_id}'`,
      });
    }
    nextModules.push(m);
  }
  const nextPages = site.pages.map((p, i) =>
    i === pageIdx ? { ...p, modules: nextModules } : p,
  );
  return runValidator({ ...site, pages: nextPages }, call.name);
}

function applySetThemeToken(
  site: Site,
  catalog: FrameworkCatalog,
  call: ToolCall,
): ApplyResult {
  const { name, value } = call.input as { name?: unknown; value?: unknown };
  if (typeof name !== "string" || typeof value !== "string") {
    return failure({
      tool: call.name,
      message: "name and value must be strings",
    });
  }
  if (!catalog.themeTokenNames.includes(name)) {
    return failure({
      tool: call.name,
      path: `theme.${name}`,
      expected: catalog.themeTokenNames,
      got: name,
      message: `token '${name}' is not in the theme token contract`,
    });
  }
  const parts = name.split(".");
  const next = structuredClone(site) as Site;
  setNested(next.theme as unknown as Record<string, unknown>, parts, value);
  return runValidator(next, call.name);
}

function applySetSiteConfig(site: Site, call: ToolCall): ApplyResult {
  const { field, value } = call.input as { field?: unknown; value?: unknown };
  if (typeof field !== "string") {
    return failure({
      tool: call.name,
      message: "field must be a string",
    });
  }
  const next = structuredClone(site) as Site;
  setNested(next.config as unknown as Record<string, unknown>, field.split("."), value);
  return runValidator(next, call.name);
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function normalizeSlug(input: string): string {
  if (input === "/") return "/";
  return input.startsWith("/") ? input : `/${input}`;
}

function applyAddPage(site: Site, call: ToolCall): ApplyResult {
  const { slug, title, after_slug } = call.input as {
    slug?: unknown;
    title?: unknown;
    after_slug?: unknown;
  };
  if (typeof slug !== "string" || slug.length === 0) {
    return failure({ tool: call.name, message: "'slug' must be a non-empty string" });
  }
  if (typeof title !== "string" || title.length === 0) {
    return failure({ tool: call.name, message: "'title' must be a non-empty string" });
  }
  // Reject leading-slash inputs to keep the contract simple: the AI passes bare
  // slugs like "menu" or "about-us".
  if (slug.startsWith("/")) {
    return failure({
      tool: call.name,
      message: `slug '${slug}' must be a bare segment (e.g. 'menu'), not a leading-slash path`,
    });
  }
  if (!SLUG_RE.test(slug)) {
    return failure({
      tool: call.name,
      message: `invalid slug '${slug}': must match ${SLUG_RE.source}`,
    });
  }
  const storedSlug = `/${slug}`;
  if (site.pages.some((p) => p.slug === storedSlug)) {
    return failure({
      tool: call.name,
      message: `page with slug '${storedSlug}' already exists (duplicate)`,
    });
  }
  if (site.pages.some((p) => p.id === slug)) {
    return failure({
      tool: call.name,
      message: `page id '${slug}' already exists`,
    });
  }
  let insertAt = site.pages.length;
  if (after_slug !== undefined) {
    if (typeof after_slug !== "string") {
      return failure({
        tool: call.name,
        message: "'after_slug' must be a string when provided",
      });
    }
    const target = normalizeSlug(after_slug);
    const idx = site.pages.findIndex((p) => p.slug === target);
    if (idx < 0) {
      return failure({
        tool: call.name,
        message: `after_slug '${after_slug}' not found`,
      });
    }
    insertAt = idx + 1;
  }
  const newPage: Page = {
    id: slug,
    slug: storedSlug,
    title,
    modules: [],
  };
  const nextPages = [...site.pages];
  nextPages.splice(insertAt, 0, newPage);
  return runValidator({ ...site, pages: nextPages }, call.name);
}

function applyRemovePage(site: Site, call: ToolCall): ApplyResult {
  const { slug } = call.input as { slug?: unknown };
  if (typeof slug !== "string" || slug.length === 0) {
    return failure({ tool: call.name, message: "'slug' must be a non-empty string" });
  }
  if (site.pages.length <= 1) {
    return failure({ tool: call.name, message: "cannot_remove_only_page" });
  }
  const target = normalizeSlug(slug);
  const idx = site.pages.findIndex((p) => p.slug === target);
  if (idx < 0) {
    return failure({ tool: call.name, message: `no page with slug '${slug}' (not found)` });
  }
  const removed = site.pages[idx]!;
  const nextPages = site.pages.filter((_, i) => i !== idx);
  const nextNavEntries = site.nav.entries.filter((e) => {
    if (e.target.kind === "page" && e.target.pageId === removed.id) return false;
    if (e.target.kind === "anchor" && e.target.pageId === removed.id) return false;
    return true;
  });
  return runValidator(
    { ...site, pages: nextPages, nav: { ...site.nav, entries: nextNavEntries } },
    call.name,
  );
}

function applyReorderPages(site: Site, call: ToolCall): ApplyResult {
  const { slugs } = call.input as { slugs?: unknown };
  if (!Array.isArray(slugs)) {
    return failure({ tool: call.name, message: "'slugs' must be an array of strings" });
  }
  if (slugs.length !== site.pages.length) {
    return failure({
      tool: call.name,
      message: `slugs must list every page exactly once (got ${slugs.length}, expected ${site.pages.length})`,
    });
  }
  const normalized: string[] = [];
  for (const raw of slugs as unknown[]) {
    if (typeof raw !== "string" || raw.length === 0) {
      return failure({ tool: call.name, message: "'slugs' must be non-empty strings" });
    }
    normalized.push(normalizeSlug(raw));
  }
  const seen = new Set<string>();
  for (const s of normalized) {
    if (seen.has(s)) {
      return failure({ tool: call.name, message: `slug '${s}' repeated in slugs list` });
    }
    seen.add(s);
  }
  const bySlug = new Map(site.pages.map((p) => [p.slug, p]));
  const nextPages: Page[] = [];
  for (const s of normalized) {
    const page = bySlug.get(s);
    if (!page) {
      return failure({
        tool: call.name,
        message: `slug '${s}' is not an existing page`,
      });
    }
    nextPages.push(page);
  }
  return runValidator({ ...site, pages: nextPages }, call.name);
}

function mutateModule(
  site: Site,
  instanceId: string,
  patch: (m: ModuleInstance) => ModuleInstance,
  tool: ToolName,
): ApplyResult {
  let touched = false;
  const nextPages: Page[] = site.pages.map((page) => {
    if (!page.modules.some((m) => m.id === instanceId)) return page;
    touched = true;
    return {
      ...page,
      modules: page.modules.map((m) => (m.id === instanceId ? patch(m) : m)),
    };
  });
  if (!touched) {
    return failure({
      tool,
      message: `no module with id '${instanceId}'`,
    });
  }
  return runValidator({ ...site, pages: nextPages }, tool);
}

function findInstance(
  site: Site,
  instanceId: string,
): { pageId: string; instance: ModuleInstance } | null {
  for (const page of site.pages) {
    const inst = page.modules.find((m) => m.id === instanceId);
    if (inst) return { pageId: page.id, instance: inst };
  }
  return null;
}

function runValidator(candidate: Site, tool: ToolName): ApplyResult {
  const result = validateSite(candidate);
  if (result.ok) return { ok: true, next: result.value };
  const first = result.errors[0]!;
  return failure({
    tool,
    path: first.path,
    message: first.message,
  });
}

function failure(error: ToolApplyError): ApplyResult {
  return { ok: false, error };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function setNested(
  target: Record<string, unknown>,
  parts: string[],
  value: unknown,
): void {
  let cursor: Record<string, unknown> = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    const existing = cursor[key];
    if (!isPlainObject(existing)) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]!] = value;
}
