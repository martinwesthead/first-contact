import { describe, expect, it } from "vitest";
import { validateSite } from "@1stcontact/site-schema";
import { makeFullSite } from "./_fixtures_REQ-3_site";

describe("UAT AC-392: valid full site exercising every slot validates", () => {
  it("test_UAT_AC392_valid_full_site_validates", () => {
    const site = makeFullSite();
    const result = validateSite(site);

    if (!result.ok) {
      console.error(JSON.stringify(result.errors, null, 2));
    }
    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.config.businessName.length).toBeGreaterThan(0);
      expect(result.value.pages.length).toBeGreaterThan(1);
      const navKinds = result.value.nav.entries.map((e) => e.target.kind);
      expect(navKinds).toContain("page");
      expect(navKinds).toContain("anchor");
      expect(navKinds).toContain("url");
      expect(result.value.assets).toBeDefined();
      expect(result.value.assets?.length ?? 0).toBeGreaterThan(0);

      const firstPageModules = result.value.pages[0].modules;
      const heroModule = firstPageModules.find((m) => m.variant !== undefined);
      expect(heroModule, "fixture exercises module variant").toBeDefined();
      expect(heroModule?.dials, "fixture exercises module dials").toBeDefined();
      expect(heroModule?.content, "fixture exercises module content").toBeDefined();
    }
  });
});
