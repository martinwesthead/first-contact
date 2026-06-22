import { describe, expect, it } from "vitest";
import { applyToolCall, type ToolName } from "@gendev/builder-ui/tools";
import { buildFrameworkCatalog } from "@gendev/builder-ui";
import { findAction } from "../apps/control-app/src/operator/registry.js";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import type { Site } from "@gendev/site-schema";

const catalog = buildFrameworkCatalog();

function call(site: Site, name: string, input: Record<string, unknown>): ReturnType<typeof applyToolCall> {
  return applyToolCall(site, catalog, { name: name as ToolName, input });
}

describe("UAT FC REQ-30: page-CRUD state-edit tools (AC4)", () => {
  it("registry exposes add_page, remove_page, reorder_pages as state_edit tools", () => {
    for (const name of ["add_page", "remove_page", "reorder_pages"]) {
      const action = findAction(name);
      expect(action, `${name} not registered`).toBeDefined();
      expect(action!.category).toBe("state_edit");
      expect(action!.tool_spec.name).toBe(name);
    }
  });

  it("add_page on a single-page site results in two pages, '/' then '/menu', with empty modules", () => {
    const site = load1stContactSite();
    expect(site.pages.length).toBe(1);
    expect(site.pages[0].slug).toBe("/");

    const result = call(site, "add_page", { slug: "menu", title: "Menu" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.next.pages).toHaveLength(2);
    expect(result.next.pages[0].slug).toBe("/");
    expect(result.next.pages[1].slug).toBe("/menu");
    expect(result.next.pages[1].title).toBe("Menu");
    expect(result.next.pages[1].modules).toEqual([]);
  });

  it("add_page accepts after_slug to control insertion point", () => {
    let site = load1stContactSite();
    site = (call(site, "add_page", { slug: "menu", title: "Menu" }) as { ok: true; next: Site }).next;
    site = (call(site, "add_page", { slug: "contact", title: "Contact" }) as { ok: true; next: Site }).next;
    // insert 'about' after '/' (home) — should end up second
    const result = call(site, "add_page", { slug: "about", title: "About", after_slug: "/" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.next.pages.map((p) => p.slug)).toEqual(["/", "/about", "/menu", "/contact"]);
  });

  it("add_page rejects an invalid slug format", () => {
    const site = load1stContactSite();
    const result = call(site, "add_page", { slug: "Bad Slug!", title: "Bad" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/slug/i);
  });

  it("add_page rejects a duplicate slug", () => {
    const site = load1stContactSite();
    const intermediate = call(site, "add_page", { slug: "menu", title: "Menu" });
    expect(intermediate.ok).toBe(true);
    if (!intermediate.ok) return;
    const result = call(intermediate.next, "add_page", { slug: "menu", title: "Menu 2" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/duplicate|exists|already/i);
  });

  it("add_page rejects when after_slug doesn't exist", () => {
    const site = load1stContactSite();
    const result = call(site, "add_page", {
      slug: "menu",
      title: "Menu",
      after_slug: "nonexistent",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/after_slug|not found|nonexistent/i);
  });

  it("remove_page removes the page and strips nav entries pointing at it", () => {
    let site = load1stContactSite();
    site = (call(site, "add_page", { slug: "menu", title: "Menu" }) as { ok: true; next: Site }).next;
    const menuPage = site.pages.find((p) => p.slug === "/menu")!;
    // Add a nav entry pointing at the page-to-be-removed (by pageId, per schema).
    site = {
      ...site,
      nav: {
        ...site.nav,
        entries: [
          { label: "Menu", target: { kind: "page", pageId: menuPage.id } },
        ],
      },
    };
    const result = call(site, "remove_page", { slug: "/menu" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.next.pages.map((p) => p.slug)).toEqual(["/"]);
    expect(result.next.nav.entries).toEqual([]);
  });

  it("remove_page on the only page fails with cannot_remove_only_page", () => {
    const site = load1stContactSite();
    expect(site.pages.length).toBe(1);
    const result = call(site, "remove_page", { slug: "/" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/cannot_remove_only_page/);
  });

  it("remove_page rejects when slug doesn't exist", () => {
    let site = load1stContactSite();
    site = (call(site, "add_page", { slug: "menu", title: "Menu" }) as { ok: true; next: Site }).next;
    const result = call(site, "remove_page", { slug: "/nonexistent" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/not found|no page|nonexistent/i);
  });

  it("reorder_pages reorders the pages array", () => {
    let site = load1stContactSite();
    site = (call(site, "add_page", { slug: "menu", title: "Menu" }) as { ok: true; next: Site }).next;
    site = (call(site, "add_page", { slug: "contact", title: "Contact" }) as { ok: true; next: Site }).next;
    expect(site.pages.map((p) => p.slug)).toEqual(["/", "/menu", "/contact"]);

    const result = call(site, "reorder_pages", { slugs: ["/", "/contact", "/menu"] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.next.pages.map((p) => p.slug)).toEqual(["/", "/contact", "/menu"]);
  });

  it("reorder_pages rejects when list misses a page", () => {
    let site = load1stContactSite();
    site = (call(site, "add_page", { slug: "menu", title: "Menu" }) as { ok: true; next: Site }).next;
    const result = call(site, "reorder_pages", { slugs: ["/"] });
    expect(result.ok).toBe(false);
  });

  it("reorder_pages rejects when list contains a duplicate", () => {
    let site = load1stContactSite();
    site = (call(site, "add_page", { slug: "menu", title: "Menu" }) as { ok: true; next: Site }).next;
    const result = call(site, "reorder_pages", { slugs: ["/", "/", "/menu"] });
    expect(result.ok).toBe(false);
  });
});
