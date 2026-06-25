import { describe, expect, it } from "vitest";
import { CatalogMissError, getModule, headerMeta } from "@1stcontact/framework";

describe("UAT AC-413: registry surfaces a catalog-miss error for an unknown version of a known module", () => {
  it("test_UAT_AC413_registry_catalog_miss_for_unknown_version", () => {
    const knownId = "header";
    const unknownVersion = 99;

    expect(() => getModule(knownId, unknownVersion)).toThrow(CatalogMissError);

    let caught: unknown;
    try {
      getModule(knownId, unknownVersion);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(CatalogMissError);
    const err = caught as CatalogMissError;
    expect(err.moduleId).toBe(knownId);
    expect(err.version).toBe(unknownVersion);
    // Error must identify the id and list the actual registered version(s).
    expect(err.message).toContain(knownId);
    expect(err.message).toContain(String(headerMeta.version));
  });
});
