import { describe, expect, it } from "vitest";
import { CatalogMissError, getModule, listRegisteredModules } from "@1stcontact/framework";

describe("UAT AC-412: registry surfaces a catalog-miss error for an unknown module id", () => {
  it("test_UAT_AC412_registry_catalog_miss_for_unknown_id", () => {
    const unknownId = "totally-fake-module-id-xyz";

    expect(() => getModule(unknownId, 1)).toThrow(CatalogMissError);

    let caught: unknown;
    try {
      getModule(unknownId, 1);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(CatalogMissError);
    const err = caught as CatalogMissError;
    expect(err.moduleId).toBe(unknownId);
    expect(err.message).toContain(unknownId);

    // The error message must describe modules that are currently registered.
    const registered = listRegisteredModules();
    expect(registered.length).toBeGreaterThan(0);
    // At least one registered id should appear in the error message so a
    // caller can diagnose a typo or missing registration.
    const mentioned = registered.some((entry) => err.message.includes(entry.id));
    expect(mentioned).toBe(true);
  });
});
