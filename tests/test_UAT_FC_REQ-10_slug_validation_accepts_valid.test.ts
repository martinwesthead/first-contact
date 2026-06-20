import { describe, expect, it } from "vitest";
import { isValidSlug } from "../packages/site-schema/src/slug.js";

describe("UAT FC REQ-10: slug validation accepts well-formed slugs", () => {
  it.each([
    "acme",
    "my-bakery",
    "a-1-b",
    "abc",
    "long-but-still-under-forty-characters",
    "site42",
    "a1b2",
  ])("accepts %s", (slug) => {
    expect(isValidSlug(slug)).toBe(true);
  });
});
