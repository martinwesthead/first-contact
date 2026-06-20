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

describe("UAT FC REQ-14: duplicate_module", () => {
  it("registers duplicate_module as a state_edit tool", () => {
    const action = findAction("duplicate_module");
    expect(action).toBeDefined();
    expect(action!.category).toBe("state_edit");
  });

  it("duplicate_module_clones_content_and_dials and assigns a new id", () => {
    const site = load1stContactSite();
    const sourceId = "hero";
    const source = site.pages[0]!.modules.find((m) => m.id === sourceId);
    if (!source) {
      throw new Error("test setup: expected 'hero' module on home page");
    }
    const result = call(site, "duplicate_module", { instance_id: sourceId });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const homeModules = result.next.pages[0]!.modules;
    expect(homeModules.length).toBe(site.pages[0]!.modules.length + 1);
    const clone = homeModules.find((m) => m.id !== sourceId && m.type === source.type);
    expect(clone).toBeDefined();
    expect(clone!.id).not.toBe(source.id);
    expect(clone!.type).toBe(source.type);
    expect(clone!.version).toBe(source.version);
    expect(clone!.variant).toBe(source.variant);
    expect(clone!.dials).toEqual(source.dials);
    expect(clone!.content).toEqual(source.content);
  });

  it("duplicate_module_inserts_after_source_by_default", () => {
    const site = load1stContactSite();
    const sourceId = "hero";
    const sourceIdx = site.pages[0]!.modules.findIndex((m) => m.id === sourceId);
    const result = call(site, "duplicate_module", { instance_id: sourceId });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.next.pages[0]!.modules[sourceIdx]!.id).toBe(sourceId);
    const cloneAt = sourceIdx + 1;
    expect(result.next.pages[0]!.modules[cloneAt]!.type).toBe(
      site.pages[0]!.modules[sourceIdx]!.type,
    );
    expect(result.next.pages[0]!.modules[cloneAt]!.id).not.toBe(sourceId);
  });

  it("duplicate_module honors after_instance_id when supplied", () => {
    const site = load1stContactSite();
    const homePage = site.pages[0]!;
    const sourceId = "hero";
    const lastId = homePage.modules[homePage.modules.length - 1]!.id;
    const result = call(site, "duplicate_module", {
      instance_id: sourceId,
      after_instance_id: lastId,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const nextHomeModules = result.next.pages[0]!.modules;
    expect(nextHomeModules[nextHomeModules.length - 1]!.type).toBe(
      homePage.modules.find((m) => m.id === sourceId)!.type,
    );
  });

  it("duplicate_module_rejects_cross_page_target", () => {
    const site = load1stContactSite();
    const r1 = call(site, "add_page", { slug: "menu", title: "Menu" });
    if (!r1.ok) throw new Error("setup");
    const r2 = call(r1.next, "add_module", {
      page_id: "menu",
      type: "text-block",
      version: 1,
      id: "menu-only-mod",
    });
    if (!r2.ok) throw new Error("setup add_module");
    const result = call(r2.next, "duplicate_module", {
      instance_id: "hero",
      after_instance_id: "menu-only-mod",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/not on the same page/);
  });

  it("rejects when source instance_id does not exist", () => {
    const site = load1stContactSite();
    const result = call(site, "duplicate_module", { instance_id: "nope" });
    expect(result.ok).toBe(false);
  });
});
