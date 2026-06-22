import { describe, expect, it } from "vitest";
import { applyToolCall, type ToolName } from "@gendev/builder-ui/tools";
import { buildFrameworkCatalog } from "@gendev/builder-ui";
import { findAction } from "../apps/control-app/src/operator/registry.js";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import type { NavEntry, Site } from "@gendev/site-schema";

const catalog = buildFrameworkCatalog();

function call(
  site: Site,
  name: string,
  input: Record<string, unknown>,
): ReturnType<typeof applyToolCall> {
  return applyToolCall(site, catalog, { name: name as ToolName, input });
}

function siteWithSecondPage(): Site {
  const site = load1stContactSite();
  const r = call(site, "add_page", { slug: "menu", title: "Menu" });
  if (!r.ok) throw new Error("test setup failure: add_page");
  return r.next;
}

describe("UAT FC REQ-14: set_nav_entries", () => {
  it("registers set_nav_entries as a state_edit tool", () => {
    const action = findAction("set_nav_entries");
    expect(action).toBeDefined();
    expect(action!.category).toBe("state_edit");
  });

  it("set_nav_entries_replaces_list replaces the entries wholesale", () => {
    const site = siteWithSecondPage();
    const entries: NavEntry[] = [
      { label: "Home", target: { kind: "page", pageId: "home" } },
      { label: "Menu", target: { kind: "page", pageId: "menu" } },
    ];
    const result = call(site, "set_nav_entries", { entries });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.next.nav.entries.map((e) => e.label)).toEqual(["Home", "Menu"]);
  });

  it("set_nav_entries_rejects_orphan_page when pageId does not exist", () => {
    const site = load1stContactSite();
    const entries: NavEntry[] = [
      { label: "Ghost", target: { kind: "page", pageId: "ghost" } },
    ];
    const result = call(site, "set_nav_entries", { entries });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/unknown page id.*ghost/);
  });

  it("set_nav_entries_rejects_orphan_anchor when moduleId does not exist", () => {
    const site = load1stContactSite();
    const entries: NavEntry[] = [
      {
        label: "Hero",
        target: { kind: "anchor", pageId: "home", moduleId: "nonexistent-mod" },
      },
    ];
    const result = call(site, "set_nav_entries", { entries });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/unknown module id.*nonexistent-mod/);
  });

  it("set_nav_entries rejects duplicate labels", () => {
    const site = siteWithSecondPage();
    const entries: NavEntry[] = [
      { label: "Page", target: { kind: "page", pageId: "home" } },
      { label: "Page", target: { kind: "page", pageId: "menu" } },
    ];
    const result = call(site, "set_nav_entries", { entries });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/duplicate nav entry label/);
  });

  it("set_nav_entries accepts url-kind targets without resolution checks", () => {
    const site = load1stContactSite();
    const entries: NavEntry[] = [
      { label: "Blog", target: { kind: "url", href: "https://blog.example/" } },
    ];
    const result = call(site, "set_nav_entries", { entries });
    expect(result.ok).toBe(true);
  });

  it("rejects non-array input", () => {
    const site = load1stContactSite();
    const result = call(site, "set_nav_entries", { entries: "not-an-array" });
    expect(result.ok).toBe(false);
  });
});
