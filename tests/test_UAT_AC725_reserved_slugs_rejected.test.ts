import { describe, expect, it } from "vitest";
import { isReservedSlug } from "../packages/site-schema/src/slug.js";

describe("UAT AC-725: reserved slugs are unavailable to operators", () => {
  it("test_UAT_AC725_reserved_slugs_rejected", () => {
    // Reserved names called out in the AC, plus a case variant.
    const reserved = ["api", "www", "admin", "preview", "1stcontact", "1stContact"];
    for (const slug of reserved) {
      expect(isReservedSlug(slug), `expected reserved: ${slug}`).toBe(true);
    }

    // A non-reserved well-formed slug reports not reserved.
    expect(isReservedSlug("acme")).toBe(false);
  });
});
