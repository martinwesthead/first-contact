import { describe, expect, it } from "vitest";
import { isValidSlug } from "../packages/site-schema/src/slug.js";

describe("UAT FC REQ-10: slug validation rejects malformed slugs", () => {
  it.each([
    ["", "empty string"],
    ["ab", "too short (under 3 chars)"],
    ["a".repeat(41), "too long (over 40 chars)"],
    ["Acme", "uppercase letter"],
    ["my_bakery", "underscore"],
    ["my.bakery", "dot"],
    ["my bakery", "whitespace"],
    ["my--bakery", "consecutive hyphens"],
    ["-bakery", "leading hyphen"],
    ["bakery-", "trailing hyphen"],
    ["my#bakery", "special character"],
    ["café", "non-ASCII"],
  ])("rejects %s (%s)", (slug) => {
    expect(isValidSlug(slug)).toBe(false);
  });
});
