import { describe, expect, it } from "vitest";
import { isReservedSlug } from "../packages/site-schema/src/slug.js";

describe("UAT FC REQ-10: reserved slugs cannot be claimed by operators", () => {
  it.each([
    "api",
    "app",
    "www",
    "admin",
    "preview",
    "ftp",
    "mail",
    "blog",
    "status",
    "dashboard",
    "control",
    "docs",
    "help",
    "support",
    "1stcontact",
    "gendev",
    "gendevlabs",
  ])("rejects reserved slug %s", (slug) => {
    expect(isReservedSlug(slug)).toBe(true);
  });

  it("treats unknown slugs as not reserved", () => {
    expect(isReservedSlug("acme")).toBe(false);
    expect(isReservedSlug("my-bakery")).toBe(false);
  });

  it("matches case-insensitively", () => {
    expect(isReservedSlug("API")).toBe(true);
    expect(isReservedSlug("1stContact")).toBe(true);
  });
});
