import { describe, expect, it } from "vitest";
import {
  isReservedSlug,
  isValidSlug,
  suggestAlternativeSlug,
} from "../packages/site-schema/src/slug.js";

describe("UAT FC REQ-10: collision suggestions return usable alternatives", () => {
  it("returns at least three valid, non-reserved candidates that differ from the input", () => {
    const taken = "acme";
    const suggestions = suggestAlternativeSlug(taken);
    expect(suggestions.length).toBeGreaterThanOrEqual(3);
    for (const candidate of suggestions) {
      expect(candidate).not.toBe(taken);
      expect(isValidSlug(candidate)).toBe(true);
      expect(isReservedSlug(candidate)).toBe(false);
    }
  });

  it("handles a reserved slug as input by returning non-reserved alternatives", () => {
    const suggestions = suggestAlternativeSlug("api");
    expect(suggestions.length).toBeGreaterThanOrEqual(3);
    for (const candidate of suggestions) {
      expect(isReservedSlug(candidate)).toBe(false);
      expect(isValidSlug(candidate)).toBe(true);
    }
  });

  it("clamps overlong inputs so suggestions stay within slug length bounds", () => {
    const long = "a".repeat(60);
    const suggestions = suggestAlternativeSlug(long);
    for (const candidate of suggestions) {
      expect(candidate.length).toBeLessThanOrEqual(40);
      expect(candidate.length).toBeGreaterThanOrEqual(3);
    }
  });
});
