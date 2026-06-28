import { describe, expect, it } from "vitest";
import { applyToolCall, type ToolName } from "@1stcontact/builder-ui/tools";
import { buildFrameworkCatalog } from "@1stcontact/builder-ui";
import { findAction } from "../apps/control-app/src/operator/registry.js";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import type { Site } from "@1stcontact/site-schema";

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

const slugsOf = (site: Site): string[] => site.pages.map((p) => p.slug);

describe("Reconciliation: AI page-management tools (story-e893e643)", () => {
  // AC-650 — page-management tools are offered on the AI site-editing surface.
  it("test_UAT_AC650_page_tools_are_state_edit_with_documented_inputs", () => {
    const expected: Record<string, string[]> = {
      add_page: ["slug", "title"],
      remove_page: ["slug"],
      reorder_pages: ["slugs"],
    };
    for (const [name, required] of Object.entries(expected)) {
      const action = findAction(name);
      expect(action, `${name} not registered`).toBeDefined();
      expect(action!.category).toBe("state_edit");
      expect(action!.tool_spec.name).toBe(name);
      expect(action!.tool_spec.input_schema.required).toEqual(required);
    }
    // add_page advertises the optional after_slug input.
    expect(
      findAction("add_page")!.tool_spec.input_schema.properties,
    ).toHaveProperty("after_slug");
  });

  // AC-651 — add_page appends an empty page at the canonical slug.
  it("test_UAT_AC651_add_page_appends_empty_canonical_page", () => {
    const site = load1stContactSite();
    expect(site.pages).toHaveLength(1);
    expect(site.pages[0].slug).toBe("/");

    const result = call(site, "add_page", { slug: "menu", title: "Menu" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(slugsOf(result.next)).toEqual(["/", "/menu"]);
    expect(result.next.pages[1].title).toBe("Menu");
    expect(result.next.pages[1].modules).toEqual([]);
  });

  // AC-652 — add_page after_slug controls insertion position.
  it("test_UAT_AC652_add_page_after_slug_controls_position", () => {
    let site = load1stContactSite();
    site = applyOk(site, "add_page", { slug: "menu", title: "Menu" });
    site = applyOk(site, "add_page", { slug: "contact", title: "Contact" });
    expect(slugsOf(site)).toEqual(["/", "/menu", "/contact"]);

    const result = call(site, "add_page", {
      slug: "about",
      title: "About",
      after_slug: "/",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(slugsOf(result.next)).toEqual(["/", "/about", "/menu", "/contact"]);
  });

  // AC-653 — add_page rejects an invalid slug format.
  it("test_UAT_AC653_add_page_rejects_invalid_slug_format", () => {
    const site = load1stContactSite();
    const before = slugsOf(site);
    const result = call(site, "add_page", { slug: "Bad Slug!", title: "Bad" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/slug/i);
    // Draft left unchanged.
    expect(slugsOf(site)).toEqual(before);
  });

  // AC-654 — add_page rejects a duplicate slug.
  it("test_UAT_AC654_add_page_rejects_duplicate_slug", () => {
    const site = load1stContactSite();
    const intermediate = call(site, "add_page", { slug: "menu", title: "Menu" });
    expect(intermediate.ok).toBe(true);
    if (!intermediate.ok) return;
    const beforeCount = intermediate.next.pages.length;

    const result = call(intermediate.next, "add_page", { slug: "menu", title: "Menu 2" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/duplicate|exists|already/i);
    // Page count unchanged.
    expect(intermediate.next.pages.length).toBe(beforeCount);
  });

  // AC-655 — add_page rejects an unknown after_slug.
  it("test_UAT_AC655_add_page_rejects_unknown_after_slug", () => {
    const site = load1stContactSite();
    const before = slugsOf(site);
    const result = call(site, "add_page", {
      slug: "menu",
      title: "Menu",
      after_slug: "nonexistent",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/after_slug|not found|nonexistent/i);
    // No page added.
    expect(slugsOf(site)).toEqual(before);
  });

  // AC-656 — remove_page deletes the page and strips nav entries pointing at it.
  it("test_UAT_AC656_remove_page_deletes_and_strips_nav", () => {
    let site = load1stContactSite();
    site = applyOk(site, "add_page", { slug: "menu", title: "Menu" });
    const menuPage = site.pages.find((p) => p.slug === "/menu")!;
    site = {
      ...site,
      nav: {
        ...site.nav,
        entries: [{ label: "Menu", target: { kind: "page", pageId: menuPage.id } }],
      },
    };

    const result = call(site, "remove_page", { slug: "/menu" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(slugsOf(result.next)).toEqual(["/"]);
    expect(result.next.nav.entries).toEqual([]);
  });

  // AC-657 — remove_page refuses to delete the only remaining page.
  it("test_UAT_AC657_remove_page_refuses_only_page", () => {
    const site = load1stContactSite();
    expect(site.pages).toHaveLength(1);
    const result = call(site, "remove_page", { slug: "/" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/cannot_remove_only_page/);
    // Single page retained.
    expect(site.pages).toHaveLength(1);
  });

  // AC-658 — remove_page rejects an unknown slug.
  it("test_UAT_AC658_remove_page_rejects_unknown_slug", () => {
    let site = load1stContactSite();
    site = applyOk(site, "add_page", { slug: "menu", title: "Menu" });
    const beforeCount = site.pages.length;

    const result = call(site, "remove_page", { slug: "/nonexistent" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/not found|no page|nonexistent/i);
    // Page count unchanged.
    expect(site.pages.length).toBe(beforeCount);
  });

  // AC-659 — reorder_pages applies a full page permutation.
  it("test_UAT_AC659_reorder_pages_applies_full_permutation", () => {
    let site = load1stContactSite();
    site = applyOk(site, "add_page", { slug: "menu", title: "Menu" });
    site = applyOk(site, "add_page", { slug: "contact", title: "Contact" });
    expect(slugsOf(site)).toEqual(["/", "/menu", "/contact"]);

    const result = call(site, "reorder_pages", { slugs: ["/", "/contact", "/menu"] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(slugsOf(result.next)).toEqual(["/", "/contact", "/menu"]);
  });

  // AC-660 — reorder_pages rejects a list that omits a page.
  it("test_UAT_AC660_reorder_pages_rejects_omitted_page", () => {
    let site = load1stContactSite();
    site = applyOk(site, "add_page", { slug: "menu", title: "Menu" });
    const before = slugsOf(site);

    const result = call(site, "reorder_pages", { slugs: ["/"] });
    expect(result.ok).toBe(false);
    // Page order unchanged.
    expect(slugsOf(site)).toEqual(before);
  });

  // AC-661 — reorder_pages rejects a list containing a duplicate slug.
  it("test_UAT_AC661_reorder_pages_rejects_duplicate_slug", () => {
    let site = load1stContactSite();
    site = applyOk(site, "add_page", { slug: "menu", title: "Menu" });
    const before = slugsOf(site);

    const result = call(site, "reorder_pages", { slugs: ["/", "/", "/menu"] });
    expect(result.ok).toBe(false);
    // Page order unchanged.
    expect(slugsOf(site)).toEqual(before);
  });
});
