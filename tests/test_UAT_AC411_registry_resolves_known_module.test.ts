import { describe, expect, it } from "vitest";
import {
  footerMeta,
  getModule,
  headerMeta,
  heroMeta,
} from "@1stcontact/framework";

describe("UAT AC-411: registry resolves a known module to its component and meta", () => {
  it("test_UAT_AC411_registry_resolves_known_module", () => {
    const cases = [
      { id: "header", meta: headerMeta },
      { id: "hero", meta: heroMeta },
      { id: "footer", meta: footerMeta },
    ];

    for (const { id, meta } of cases) {
      const entry = getModule(meta.id, meta.version);
      expect(entry.meta.id).toBe(id);
      expect(entry.meta.id).toBe(meta.id);
      expect(entry.meta.version).toBe(meta.version);
      expect(Array.isArray(entry.meta.variants)).toBe(true);
      expect(entry.meta.variants.length).toBeGreaterThan(0);
      expect(typeof entry.meta.dials).toBe("object");
      expect(Object.keys(entry.meta.dials).length).toBeGreaterThan(0);
      expect(typeof entry.meta.contentSchema).toBe("object");
      expect(Object.keys(entry.meta.contentSchema).length).toBeGreaterThan(0);
      expect(entry.Component).toBeDefined();
      expect(typeof entry.Component).toBe("function");
    }
  });
});
