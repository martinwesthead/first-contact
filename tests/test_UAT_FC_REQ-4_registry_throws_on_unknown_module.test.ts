import { describe, expect, it } from "vitest";
import { CatalogMissError, getModule } from "@1stcontact/framework";

describe("UAT FC REQ-4: registry throws on unknown module", () => {
  it("throws CatalogMissError naming the unknown id", () => {
    expect(() => getModule("nope", 1)).toThrow(CatalogMissError);
    try {
      getModule("nope", 1);
    } catch (err) {
      expect(err).toBeInstanceOf(CatalogMissError);
      expect((err as CatalogMissError).moduleId).toBe("nope");
      expect((err as Error).message).toMatch(/'nope'/);
      expect((err as Error).message).toMatch(/Available:/);
    }
  });

  it("throws when the id is known but the version is not", () => {
    expect(() => getModule("hero", 99)).toThrow(CatalogMissError);
    try {
      getModule("hero", 99);
    } catch (err) {
      expect((err as Error).message).toMatch(/'hero'/);
      expect((err as Error).message).toMatch(/v99/);
    }
  });
});
