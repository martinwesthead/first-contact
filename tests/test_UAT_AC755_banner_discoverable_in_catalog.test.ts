import { describe, expect, it } from "vitest";
import {
  bannerMeta,
  getModule,
  listRegisteredModules,
} from "@1stcontact/framework";
import {
  buildFrameworkCatalog,
  findCatalogEntry,
} from "@1stcontact/builder-ui/catalog";

// AC-755: the framework module catalog exposes banner@v1, resolvable by id and
// version, present in the builder-facing catalog, advertising exactly the
// variants ["simple", "with-cta"] and the documented dial value sets.
describe("UAT AC-755: banner v1 is discoverable in the framework module catalog", () => {
  it("test_UAT_AC755_banner_discoverable_in_catalog_with_variants_and_dials", () => {
    // Registered by id + version.
    expect(listRegisteredModules()).toEqual(
      expect.arrayContaining([{ id: "banner", version: 1 }]),
    );

    // Resolves to a renderable module entry.
    const entry = getModule("banner", 1);
    expect(entry.meta).toBe(bannerMeta);
    expect(typeof entry.Component).toBe("function");

    // Present in the builder-facing catalog with the exact advertised contract.
    const catalog = buildFrameworkCatalog();
    const catalogEntry = findCatalogEntry(catalog, "banner", 1);
    expect(catalogEntry).toBeDefined();
    expect(catalogEntry?.variants).toEqual(["simple", "with-cta"]);
    expect(catalogEntry?.dials.size).toEqual(["sm", "md", "lg"]);
    expect(catalogEntry?.dials.align).toEqual(["left", "center"]);
    expect(catalogEntry?.dials.surface).toEqual([
      "default",
      "subtle",
      "inverse",
      "accent",
    ]);
    expect(catalogEntry?.dials.spacingTop).toEqual([
      "0", "1", "2", "3", "4", "6", "8", "12", "16", "24",
    ]);
    expect(catalogEntry?.dials.spacingBottom).toEqual([
      "0", "1", "2", "3", "4", "6", "8", "12", "16", "24",
    ]);
  });
});
