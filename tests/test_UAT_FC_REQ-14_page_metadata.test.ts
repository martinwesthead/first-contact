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

function siteWithMenu(): Site {
  const site = load1stContactSite();
  const r = call(site, "add_page", { slug: "menu", title: "Menu" });
  if (!r.ok) throw new Error("test setup failure: add_page");
  return r.next;
}

describe("UAT FC REQ-14: set_page_metadata", () => {
  it("registers set_page_metadata as a state_edit tool", () => {
    const action = findAction("set_page_metadata");
    expect(action).toBeDefined();
    expect(action!.category).toBe("state_edit");
  });

  it("set_page_metadata_updates_title_and_seo patches title and seoMeta", () => {
    const site = siteWithMenu();
    const result = call(site, "set_page_metadata", {
      slug: "/menu",
      title: "Our Menu",
      seoMeta: { title: "Menu | Acme", description: "Tonight's offerings" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const menu = result.next.pages.find((p) => p.slug === "/menu")!;
    expect(menu.title).toBe("Our Menu");
    expect(menu.seoMeta?.title).toBe("Menu | Acme");
    expect(menu.seoMeta?.description).toBe("Tonight's offerings");
  });

  it("set_page_metadata_renames_slug keeps page id stable so nav refs survive", () => {
    const site = siteWithMenu();
    const menu = site.pages.find((p) => p.slug === "/menu")!;
    const siteWithNav: Site = {
      ...site,
      nav: {
        ...site.nav,
        entries: [
          { label: "Menu", target: { kind: "page", pageId: menu.id } },
        ],
      },
    };
    const result = call(siteWithNav, "set_page_metadata", {
      slug: "/menu",
      new_slug: "food",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const renamed = result.next.pages.find((p) => p.id === menu.id)!;
    expect(renamed.slug).toBe("/food");
    expect(result.next.nav.entries[0]!.target).toEqual({
      kind: "page",
      pageId: menu.id,
    });
  });

  it("set_page_metadata_rejects_slug_collision when new_slug equals an existing slug", () => {
    let site = siteWithMenu();
    const r = call(site, "add_page", { slug: "about", title: "About" });
    if (!r.ok) throw new Error("setup");
    site = r.next;
    const result = call(site, "set_page_metadata", {
      slug: "/menu",
      new_slug: "about",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/duplicate|already exists/i);
  });

  it("set_page_metadata_rejects_invalid_slug for bad format", () => {
    const site = siteWithMenu();
    const result = call(site, "set_page_metadata", {
      slug: "/menu",
      new_slug: "Bad Slug!",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/invalid new_slug/);
  });

  it("rejects when no updates are provided", () => {
    const site = siteWithMenu();
    const result = call(site, "set_page_metadata", { slug: "/menu" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/at least one of/);
  });

  it("rejects when slug does not match an existing page", () => {
    const site = load1stContactSite();
    const result = call(site, "set_page_metadata", {
      slug: "/nonexistent",
      title: "X",
    });
    expect(result.ok).toBe(false);
  });

  it("accepts bare-segment slug form like add_page does", () => {
    const site = siteWithMenu();
    const result = call(site, "set_page_metadata", {
      slug: "menu",
      title: "Bare-form Menu",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.next.pages.find((p) => p.slug === "/menu")!.title).toBe(
      "Bare-form Menu",
    );
  });
});
