import { describe, expect, it } from "vitest";
import { isValidSlug } from "../packages/site-schema/src/slug.js";

describe("UAT AC-724: malformed slugs are rejected by slug validation", () => {
  it("test_UAT_AC724_malformed_slugs_rejected", () => {
    // One representative per malformed category named in the AC.
    const malformed: Array<[string, string]> = [
      ["", "empty"],
      ["ab", "too short (< 3 chars)"],
      ["a".repeat(41), "too long (> 40 chars)"],
      ["Acme", "uppercase letter"],
      ["my#bakery", "character outside [a-z0-9-]"],
      ["-bakery", "leading hyphen"],
      ["bakery-", "trailing hyphen"],
      ["my--bakery", "consecutive hyphens"],
    ];
    for (const [slug, reason] of malformed) {
      expect(isValidSlug(slug), `expected rejected: ${reason}`).toBe(false);
    }
  });
});
