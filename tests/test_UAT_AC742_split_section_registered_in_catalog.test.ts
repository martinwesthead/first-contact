import { describe, expect, it } from "vitest";
import {
  getModule,
  listRegisteredModules,
  splitSectionMeta,
} from "@1stcontact/framework";

// AC-742: the framework module catalog includes split-section at version 1.
// Resolving by id+version returns a usable entry whose component is callable
// and whose metadata declares exactly the two layout variants.
describe("UAT AC-742: split-section is registered and resolvable with both variants", () => {
  it("test_UAT_AC742_split_section_registered_in_catalog", () => {
    // The registered-module list contains { id: "split-section", version: 1 }.
    expect(listRegisteredModules()).toEqual(
      expect.arrayContaining([{ id: "split-section", version: 1 }]),
    );

    // Resolving by id + version returns a usable catalog entry.
    const entry = getModule("split-section", 1);
    expect(entry.meta).toBe(splitSectionMeta);
    expect(typeof entry.Component).toBe("function");

    // Metadata declares exactly the two layout variants.
    expect(entry.meta.variants).toEqual(["image-left", "image-right"]);
  });
});
