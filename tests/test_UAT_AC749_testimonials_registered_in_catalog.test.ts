import { describe, expect, it } from "vitest";
import {
  getModule,
  listRegisteredModules,
  testimonialsMeta,
} from "@gendev/framework";

// AC-749: the framework module catalog includes testimonials at version 1.
// Resolving by id+version returns a usable entry whose component is callable
// and whose metadata declares exactly the two variants single and grid.
describe("UAT AC-749: testimonials is registered and resolvable with single and grid variants", () => {
  it("test_UAT_AC749_testimonials_registered_in_catalog", () => {
    // The registered-module list contains { id: "testimonials", version: 1 }.
    expect(listRegisteredModules()).toEqual(
      expect.arrayContaining([{ id: "testimonials", version: 1 }]),
    );

    // Resolving by id + version returns a usable catalog entry.
    const entry = getModule("testimonials", 1);
    expect(entry.meta).toBe(testimonialsMeta);
    expect(entry.meta.id).toBe("testimonials");
    expect(entry.meta.version).toBe(1);
    expect(typeof entry.Component).toBe("function");

    // Metadata declares exactly the two variants single and grid.
    expect(entry.meta.variants).toEqual(["single", "grid"]);
  });
});
