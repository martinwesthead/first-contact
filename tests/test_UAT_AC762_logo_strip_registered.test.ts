import { describe, expect, it } from "vitest";
import { getModule, listRegisteredModules } from "@gendev/framework";

/**
 * AC-762: The framework module catalog exposes a module whose id is
 * `logo-strip` at version 1. Looking it up through the catalog's public
 * lookup contract returns an entry declaring id `logo-strip`, version `1`,
 * and supporting the `logos` and `features` variants; the same module
 * appears in the registered-module listing.
 */
describe("UAT AC-762: logo-strip is registered in the framework catalog as logo-strip@v1", () => {
  it("test_UAT_AC762_logo_strip_registered_as_v1_with_both_variants", () => {
    const entry = getModule("logo-strip", 1);
    expect(entry.meta.id).toBe("logo-strip");
    expect(entry.meta.version).toBe(1);
    expect(entry.meta.variants).toEqual(
      expect.arrayContaining(["logos", "features"]),
    );

    const registered = listRegisteredModules();
    expect(registered).toEqual(
      expect.arrayContaining([{ id: "logo-strip", version: 1 }]),
    );
  });
});
