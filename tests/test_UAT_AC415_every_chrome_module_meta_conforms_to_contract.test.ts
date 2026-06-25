import { describe, expect, it } from "vitest";
import {
  footerMeta,
  headerMeta,
  heroMeta,
  type ModuleMeta,
} from "@1stcontact/framework";

describe("UAT AC-415: every chrome module exposes meta conforming to the module contract", () => {
  it("test_UAT_AC415_every_chrome_module_meta_conforms_to_contract", () => {
    // The type-system conformance is enforced by ModuleMeta's `satisfies` in
    // each meta.ts source file. The acceptance of these references at the
    // type level demonstrates type conformance.
    const metas: ReadonlyArray<{ name: string; meta: ModuleMeta }> = [
      { name: "header", meta: headerMeta },
      { name: "hero", meta: heroMeta },
      { name: "footer", meta: footerMeta },
    ];

    for (const { name, meta } of metas) {
      // id: non-empty string
      expect(typeof meta.id).toBe("string");
      expect(meta.id.length).toBeGreaterThan(0);
      expect(meta.id).toBe(name);

      // version: positive integer
      expect(typeof meta.version).toBe("number");
      expect(Number.isInteger(meta.version)).toBe(true);
      expect(meta.version).toBeGreaterThan(0);

      // variants: non-empty array of strings
      expect(Array.isArray(meta.variants)).toBe(true);
      expect(meta.variants.length).toBeGreaterThan(0);
      for (const variant of meta.variants) {
        expect(typeof variant).toBe("string");
      }

      // dials: every value is an array of strings (enumeration)
      expect(typeof meta.dials).toBe("object");
      const dialEntries = Object.entries(meta.dials);
      expect(dialEntries.length).toBeGreaterThan(0);
      for (const [dialName, values] of dialEntries) {
        expect(typeof dialName).toBe("string");
        expect(Array.isArray(values)).toBe(true);
        expect(values.length).toBeGreaterThan(0);
        for (const v of values) {
          expect(typeof v).toBe("string");
        }
      }

      // contentSchema: every entry declares a `type` and a boolean `required`
      expect(typeof meta.contentSchema).toBe("object");
      const schemaEntries = Object.entries(meta.contentSchema);
      expect(schemaEntries.length).toBeGreaterThan(0);
      for (const [fieldName, spec] of schemaEntries) {
        expect(typeof fieldName).toBe("string");
        expect(spec).toBeDefined();
        expect(spec.type).toBeDefined();
        expect(typeof spec.required).toBe("boolean");
      }
    }
  });
});
