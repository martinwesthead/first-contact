import { describe, expect, it } from "vitest";
import { validateSite } from "@1stcontact/site-schema";
import { makeFullSite } from "./_fixtures_REQ-3_site";

describe("UAT FC REQ-3: full site validates", () => {
  it("accepts a Site exercising every slot (theme, nav variants, multiple modules, assets)", () => {
    const result = validateSite(makeFullSite());
    if (!result.ok) {
      console.error(JSON.stringify(result.errors, null, 2));
    }
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pages).toHaveLength(2);
      expect(result.value.nav.entries).toHaveLength(3);
      expect(result.value.assets).toHaveLength(2);
    }
  });
});
