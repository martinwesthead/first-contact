import { describe, expect, it } from "vitest";
import { validateSite } from "@gendev/site-schema";
import { makeMinimalSite } from "./_fixtures_REQ-3_site";

describe("UAT FC REQ-3: minimal site validates", () => {
  it("accepts the smallest possible Site (one page, one module)", () => {
    const result = validateSite(makeMinimalSite());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pages).toHaveLength(1);
      expect(result.value.pages[0].modules).toHaveLength(1);
    }
  });
});
