import { describe, expect, it } from "vitest";
import { isValidSlug } from "../packages/site-schema/src/slug.js";

describe("UAT AC-723: well-formed slugs are accepted by slug validation", () => {
  it("test_UAT_AC723_wellformed_slugs_accepted", () => {
    // AC examples that must be accepted, plus boundary-length representatives.
    const wellFormed = [
      "acme",
      "my-bakery",
      "a-1-b",
      "abc", // minimum length (3)
      "a".repeat(40), // maximum length (40)
    ];
    for (const slug of wellFormed) {
      expect(isValidSlug(slug)).toBe(true);
    }
  });
});
