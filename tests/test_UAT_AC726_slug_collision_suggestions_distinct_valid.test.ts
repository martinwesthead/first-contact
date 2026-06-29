import { describe, expect, it } from "vitest";
import {
  isReservedSlug,
  isValidSlug,
  suggestAlternativeSlug,
} from "../packages/site-schema/src/slug.js";

describe("UAT AC-726: slug-collision suggestions return distinct valid non-reserved alternatives", () => {
  it("test_UAT_AC726_slug_collision_suggestions_distinct_valid", () => {
    const taken = "taken";
    const suggestions = suggestAlternativeSlug(taken);

    // At least three alternatives.
    expect(suggestions.length).toBeGreaterThanOrEqual(3);

    for (const candidate of suggestions) {
      expect(isValidSlug(candidate)).toBe(true); // well-formed
      expect(isReservedSlug(candidate)).toBe(false); // not reserved
      expect(candidate).not.toBe(taken); // distinct from input
    }

    // All mutually distinct.
    expect(new Set(suggestions).size).toBe(suggestions.length);
  });
});
