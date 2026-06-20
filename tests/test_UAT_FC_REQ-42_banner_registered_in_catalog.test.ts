import { describe, expect, it } from "vitest";
import {
  bannerMeta,
  getModule,
  listRegisteredModules,
} from "@1stcontact/framework";
import { buildFrameworkCatalog, findCatalogEntry } from "@1stcontact/builder-ui/catalog";

describe("UAT FC REQ-42: banner module registered in catalog", () => {
  it("listRegisteredModules contains (banner, 1)", () => {
    const registered = listRegisteredModules();
    expect(registered).toEqual(
      expect.arrayContaining([{ id: "banner", version: 1 }]),
    );
  });

  it("getModule('banner', 1) resolves the banner entry", () => {
    const entry = getModule("banner", 1);
    expect(entry.meta).toBe(bannerMeta);
    expect(typeof entry.Component).toBe("function");
  });

  it("framework catalog (builder-ui) includes banner with the spec'd dials and variants", () => {
    const catalog = buildFrameworkCatalog();
    const entry = findCatalogEntry(catalog, "banner", 1);
    expect(entry).toBeDefined();
    expect(entry?.variants).toEqual(["simple", "with-cta"]);
    expect(entry?.dials.size).toEqual(["sm", "md", "lg"]);
    expect(entry?.dials.align).toEqual(["left", "center"]);
    expect(entry?.dials.surface).toEqual([
      "default",
      "subtle",
      "inverse",
      "accent",
    ]);
    expect(entry?.dials.spacingTop).toEqual([
      "0", "1", "2", "3", "4", "6", "8", "12", "16", "24",
    ]);
    expect(entry?.dials.spacingBottom).toEqual([
      "0", "1", "2", "3", "4", "6", "8", "12", "16", "24",
    ]);
  });

  it("banner content schema matches the spec (eyebrow/heading/subhead/cta)", () => {
    expect(bannerMeta.contentSchema.eyebrow.required).toBe(false);
    expect(bannerMeta.contentSchema.eyebrow.type).toBe("string");
    expect(bannerMeta.contentSchema.heading.required).toBe(true);
    expect(bannerMeta.contentSchema.heading.type).toBe("string");
    expect(bannerMeta.contentSchema.subhead.required).toBe(false);
    expect(bannerMeta.contentSchema.subhead.type).toBe("markdown");
    expect(bannerMeta.contentSchema.cta.required).toBe(false);
  });
});
