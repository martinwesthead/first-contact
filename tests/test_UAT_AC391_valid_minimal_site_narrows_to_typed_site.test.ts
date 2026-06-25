import { describe, expect, expectTypeOf, it } from "vitest";
import { validateSite, type Site } from "@1stcontact/site-schema";
import { makeMinimalSite } from "./_fixtures_REQ-3_site";

describe("UAT AC-391: valid minimal site validates and narrows to typed Site", () => {
  it("test_UAT_AC391_valid_minimal_site_narrows_to_typed_site", () => {
    const result = validateSite(makeMinimalSite());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pages.length).toBeGreaterThan(0);
      expect(result.value.pages[0].modules.length).toBeGreaterThan(0);

      expectTypeOf(result.value).toEqualTypeOf<Site>();
      expectTypeOf(result.value.pages[0].modules[0].type).toBeString();
    }
  });
});
