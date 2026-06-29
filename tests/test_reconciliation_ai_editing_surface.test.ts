import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { applyToolCall, type ToolName } from "@1stcontact/builder-ui/tools";
import { buildFrameworkCatalog } from "@1stcontact/builder-ui";
import { validateSite } from "@1stcontact/site-schema";
import { findAction } from "../apps/control-app/src/operator/registry.js";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import type { NavEntry, Site } from "@1stcontact/site-schema";

const catalog = buildFrameworkCatalog();

function call(
  site: Site,
  name: string,
  input: Record<string, unknown>,
): ReturnType<typeof applyToolCall> {
  return applyToolCall(site, catalog, { name: name as ToolName, input });
}

/** Apply a tool call expected to succeed and return the next site (fails loudly otherwise). */
function applyOk(site: Site, name: string, input: Record<string, unknown>): Site {
  const result = call(site, name, input);
  if (!result.ok) {
    throw new Error(`expected ${name} to succeed but got: ${result.error.message}`);
  }
  return result.next;
}

/**
 * Reconciliation UATs for the AI editing tool surface (story-e893e643): nav
 * editing (set_nav_pattern / set_nav_entries), page-metadata patching, module
 * duplication, the site-wide nav cross-reference validation, and the AI
 * tool-surface / how-to documentation of these tools.
 *
 * The page-management ACs (AC-650..661) of the same story are covered in
 * test_reconciliation_page_management.test.ts; this file covers AC-705..717.
 */
describe("Reconciliation: AI nav/metadata/duplicate editing surface (story-e893e643)", () => {
  // AC-705 — set_nav_pattern sets the site nav pattern and rejects unknown values.
  it("test_UAT_AC705_set_nav_pattern_sets_and_rejects_unknown", () => {
    const site = load1stContactSite();

    const ok = call(site, "set_nav_pattern", { pattern: "top-tabs" });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.next.nav.pattern).toBe("top-tabs");

    const bad = call(site, "set_nav_pattern", { pattern: "sidebar" });
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.error.path).toBe("nav.pattern");
    expect(bad.error.got).toBe("sidebar");
    expect(Array.isArray(bad.error.expected)).toBe(true);
    // Original site is left untouched (applyToolCall is pure).
    expect(site.nav.pattern).not.toBe("sidebar");
  });

  // AC-706 — set_nav_entries replaces the nav entries wholesale.
  it("test_UAT_AC706_set_nav_entries_replaces_wholesale", () => {
    let site = load1stContactSite();
    site = applyOk(site, "add_page", { slug: "menu", title: "Menu" });
    // The starter site already ships three anchor nav entries; none must survive.
    expect(site.nav.entries.length).toBeGreaterThan(0);

    const entries: NavEntry[] = [
      { label: "Home", target: { kind: "page", pageId: "home" } },
      { label: "Menu", target: { kind: "page", pageId: "menu" } },
    ];
    const result = call(site, "set_nav_entries", { entries });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Exactly the supplied list — the prior anchor entries are gone.
    expect(result.next.nav.entries).toHaveLength(2);
    expect(result.next.nav.entries.map((e) => e.label)).toEqual(["Home", "Menu"]);
    expect(result.next.nav.entries.map((e) => e.target)).toEqual([
      { kind: "page", pageId: "home" },
      { kind: "page", pageId: "menu" },
    ]);
  });

  // AC-707 — set_nav_entries rejects an entry targeting an unknown page id.
  it("test_UAT_AC707_set_nav_entries_rejects_unknown_page_id", () => {
    const site = load1stContactSite();
    const before = structuredClone(site.nav.entries);

    const result = call(site, "set_nav_entries", {
      entries: [{ label: "Ghost", target: { kind: "page", pageId: "ghost" } }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/unknown page id.*ghost/);
    // Nav left unchanged.
    expect(site.nav.entries).toEqual(before);
  });

  // AC-708 — set_nav_entries rejects an anchor entry targeting an unknown module id.
  it("test_UAT_AC708_set_nav_entries_rejects_unknown_anchor_module", () => {
    const site = load1stContactSite();
    const before = structuredClone(site.nav.entries);

    const result = call(site, "set_nav_entries", {
      entries: [
        {
          label: "Stray",
          target: { kind: "anchor", pageId: "home", moduleId: "no-such-module" },
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/unknown module id.*no-such-module/);
    // Nav left unchanged.
    expect(site.nav.entries).toEqual(before);
  });

  // AC-709 — the site validator enforces nav cross-refs / unique labels at any entry point.
  it("test_UAT_AC709_validator_enforces_nav_xrefs_and_unique_labels", () => {
    const base = load1stContactSite();

    // Orphan page target — hand-constructed site validated directly.
    const orphan = {
      ...base,
      nav: {
        ...base.nav,
        entries: [{ label: "Ghost", target: { kind: "page", pageId: "ghost" } }],
      },
    };
    const r1 = validateSite(orphan);
    expect(r1.ok).toBe(false);
    if (!r1.ok) {
      expect(r1.errors.some((e) => /unknown page id.*ghost/.test(e.message))).toBe(true);
    }

    // Duplicate nav labels — both targets individually resolve, so the only fault is the label clash.
    const dupLabels = {
      ...base,
      nav: {
        ...base.nav,
        entries: [
          { label: "Same", target: { kind: "page", pageId: "home" } },
          { label: "Same", target: { kind: "url", href: "https://x.example/" } },
        ],
      },
    };
    const r2 = validateSite(dupLabels);
    expect(r2.ok).toBe(false);
    if (!r2.ok) {
      expect(r2.errors.some((e) => /duplicate nav entry label/.test(e.message))).toBe(
        true,
      );
    }
  });

  // AC-710 — set_page_metadata updates a page title and partial-merges seoMeta.
  it("test_UAT_AC710_set_page_metadata_updates_title_and_merges_seo", () => {
    let site = load1stContactSite();
    site = applyOk(site, "add_page", { slug: "menu", title: "Menu" });
    // Seed an existing seoMeta with two fields; one must be preserved across the merge.
    site = {
      ...site,
      pages: site.pages.map((p) =>
        p.slug === "/menu"
          ? { ...p, seoMeta: { title: "Old Title", description: "Keep me" } }
          : p,
      ),
    };

    const result = call(site, "set_page_metadata", {
      slug: "/menu",
      title: "Our Menu",
      seoMeta: { title: "Menu | Acme" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const menu = result.next.pages.find((p) => p.slug === "/menu")!;
    expect(menu.title).toBe("Our Menu");
    expect(menu.seoMeta?.title).toBe("Menu | Acme"); // supplied field overwrites
    expect(menu.seoMeta?.description).toBe("Keep me"); // omitted field preserved (merge)
  });

  // AC-711 — set_page_metadata renames a page via new_slug while keeping its id stable.
  it("test_UAT_AC711_set_page_metadata_rename_keeps_id_stable", () => {
    let site = load1stContactSite();
    site = applyOk(site, "add_page", { slug: "menu", title: "Menu" });
    const menu = site.pages.find((p) => p.slug === "/menu")!;
    site = {
      ...site,
      nav: {
        ...site.nav,
        entries: [{ label: "Menu", target: { kind: "page", pageId: menu.id } }],
      },
    };

    const result = call(site, "set_page_metadata", { slug: "/menu", new_slug: "food" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const renamed = result.next.pages.find((p) => p.id === menu.id)!;
    expect(renamed.slug).toBe("/food"); // slug changed to canonical /<new_slug>
    expect(renamed.id).toBe(menu.id); // id unchanged
    // Nav entry referencing the page by id still resolves (so the site still validates).
    expect(result.next.nav.entries[0]!.target).toEqual({
      kind: "page",
      pageId: menu.id,
    });
    expect(validateSite(result.next).ok).toBe(true);
  });

  // AC-712 — set_page_metadata rejects a slug collision and an invalid slug.
  it("test_UAT_AC712_set_page_metadata_rejects_collision_and_invalid_slug", () => {
    let site = load1stContactSite();
    site = applyOk(site, "add_page", { slug: "menu", title: "Menu" });
    site = applyOk(site, "add_page", { slug: "about", title: "About" });
    const before = site.pages.map((p) => p.slug);

    // Collision: rename /menu to an existing slug.
    const collide = call(site, "set_page_metadata", { slug: "/menu", new_slug: "about" });
    expect(collide.ok).toBe(false);
    if (!collide.ok) expect(collide.error.message).toMatch(/duplicate|already exists/i);

    // Invalid format (space).
    const badFormat = call(site, "set_page_metadata", {
      slug: "/menu",
      new_slug: "Bad Slug",
    });
    expect(badFormat.ok).toBe(false);
    if (!badFormat.ok) expect(badFormat.error.message).toMatch(/invalid new_slug/);

    // Leading-slash path is rejected as not-a-bare-segment.
    const leading = call(site, "set_page_metadata", { slug: "/menu", new_slug: "/menu" });
    expect(leading.ok).toBe(false);
    if (!leading.ok) {
      expect(leading.error.message).toMatch(/leading-slash|bare segment/);
    }

    // All rejected — page slugs unchanged.
    expect(site.pages.map((p) => p.slug)).toEqual(before);
  });

  // AC-713 — set_page_metadata requires at least one updatable field; unknown slug rejected.
  it("test_UAT_AC713_set_page_metadata_requires_field_and_known_slug", () => {
    let site = load1stContactSite();
    site = applyOk(site, "add_page", { slug: "menu", title: "Menu" });

    // Only slug supplied — no updatable field.
    const noField = call(site, "set_page_metadata", { slug: "/menu" });
    expect(noField.ok).toBe(false);
    if (!noField.ok) expect(noField.error.message).toMatch(/at least one of/);

    // Unknown page (a field is supplied so we get past the no-field guard).
    const unknown = call(site, "set_page_metadata", { slug: "/nope", title: "X" });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.error.message).toMatch(/no page with slug/);
  });

  // AC-714 — duplicate_module deep-clones an instance after the source by default.
  it("test_UAT_AC714_duplicate_module_deep_clones_after_source", () => {
    const site = load1stContactSite();
    const homeModules = site.pages[0]!.modules;
    const source = homeModules.find((m) => m.id === "hero")!;
    const sourceIdx = homeModules.findIndex((m) => m.id === "hero");

    const result = call(site, "duplicate_module", { instance_id: "hero" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.next.pages[0]!.modules;
    expect(next).toHaveLength(homeModules.length + 1);
    // Source unmoved; clone immediately after it.
    expect(next[sourceIdx]!.id).toBe("hero");
    const clone = next[sourceIdx + 1]!;
    expect(clone.id).not.toBe(source.id);
    // Fresh id, unique within the whole site.
    const allIds = result.next.pages.flatMap((p) => p.modules.map((m) => m.id));
    expect(allIds.filter((id) => id === clone.id)).toHaveLength(1);
    // Deep-clone: identical type/version/variant/dials/content.
    expect(clone.type).toBe(source.type);
    expect(clone.version).toBe(source.version);
    expect(clone.variant).toBe(source.variant);
    expect(clone.dials).toEqual(source.dials);
    expect(clone.content).toEqual(source.content);
  });

  // AC-715 — duplicate_module inserts the clone after a named same-page target.
  it("test_UAT_AC715_duplicate_module_inserts_after_named_target", () => {
    const site = load1stContactSite();
    const homeModules = site.pages[0]!.modules;
    const heroType = homeModules.find((m) => m.id === "hero")!.type;
    const targetId = homeModules[homeModules.length - 1]!.id; // 'site-footer', not the source
    expect(targetId).not.toBe("hero");

    const result = call(site, "duplicate_module", {
      instance_id: "hero",
      after_instance_id: targetId,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.next.pages[0]!.modules;
    const targetIdx = next.findIndex((m) => m.id === targetId);
    const clone = next[targetIdx + 1]!;
    expect(clone).toBeDefined();
    expect(clone.type).toBe(heroType);
    expect(clone.id).not.toBe("hero");
    expect(clone.id).not.toBe(targetId);
    // The clone landed after the named target, NOT after the source.
    const heroIdx = next.findIndex((m) => m.id === "hero");
    expect(next[heroIdx + 1]!.id).not.toBe(clone.id);
  });

  // AC-716 — duplicate_module rejects a cross-page after_instance_id and an unknown source.
  it("test_UAT_AC716_duplicate_module_rejects_cross_page_and_unknown_source", () => {
    let site = load1stContactSite();
    site = applyOk(site, "add_page", { slug: "menu", title: "Menu" });
    site = applyOk(site, "add_module", {
      page_id: "menu",
      type: "text-block",
      version: 1,
      id: "menu-only-mod",
    });
    const before = JSON.stringify(site.pages);

    // after_instance_id refers to a module on a different page than the source.
    const cross = call(site, "duplicate_module", {
      instance_id: "hero",
      after_instance_id: "menu-only-mod",
    });
    expect(cross.ok).toBe(false);
    if (!cross.ok) expect(cross.error.message).toMatch(/not on the same page/);

    // Unknown source instance id.
    const unknown = call(site, "duplicate_module", { instance_id: "no-such-module" });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.error.message).toMatch(/no module with id/);

    // Both rejected — site left unchanged.
    expect(JSON.stringify(site.pages)).toBe(before);
  });

  // AC-717 — nav / page-metadata / duplicate-module tools are offered and documented.
  it("test_UAT_AC717_nav_metadata_duplicate_tools_offered_and_documented", async () => {
    // 1. The four tools are advertised as state-editing tools with their inputs.
    const expected: Record<string, string[]> = {
      set_nav_pattern: ["pattern"],
      set_nav_entries: ["entries"],
      set_page_metadata: ["slug"],
      duplicate_module: ["instance_id"],
    };
    for (const [name, required] of Object.entries(expected)) {
      const action = findAction(name);
      expect(action, `${name} not registered`).toBeDefined();
      expect(action!.category).toBe("state_edit");
      expect(action!.tool_spec.name).toBe(name);
      expect(action!.tool_spec.input_schema.required).toEqual(required);
    }

    // 2. The reproducing-a-website how-to references the four tools and the nav-wiring step.
    const here = dirname(fileURLToPath(import.meta.url));
    const howtoPath = resolve(here, "../docs/llm-context/reproducing-a-website.md");
    const doc = readFileSync(howtoPath, "utf-8");
    expect(doc).toMatch(/Wire up the nav/);
    expect(doc).toMatch(/set_nav_entries/);
    expect(doc).toMatch(/set_nav_pattern/);
    expect(doc).toMatch(/set_page_metadata/);
    expect(doc).toMatch(/duplicate_module/);

    // 3. The system prompt actually sent to the model on a chat turn surfaces them.
    let capturedSystem = "";
    const upstreamFetch = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        capturedSystem = JSON.parse(String(init?.body)).system as string;
        return new Response(
          JSON.stringify({ id: "msg_test", content: [{ type: "text", text: "ok" }] }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    );
    const request = new Request("https://app.test/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        history: [{ role: "user", content: "hi" }],
        siteDefinition: load1stContactSite(),
        frameworkCatalog: buildFrameworkCatalog(),
      }),
    });
    const response = await handleChatRequest(
      request,
      { CLAUDE_API_KEY: "test-key" },
      { fetch: upstreamFetch as unknown as typeof fetch },
    );
    expect(response.status).toBe(200);
    // The system-prompt editing rules surface the tools and the nav-wiring step
    // (chat.ts Rules section). The canonical "Wire up the nav" how-to heading is
    // asserted against the doc file above; byte-parity between that doc and the
    // inlined system-prompt copy is a separate drift invariant (REQ-30 test).
    expect(capturedSystem).toMatch(/set_nav_entries/);
    expect(capturedSystem).toMatch(/duplicate_module/);
    expect(capturedSystem).toMatch(/keep the site nav consistent/);
  });
});
