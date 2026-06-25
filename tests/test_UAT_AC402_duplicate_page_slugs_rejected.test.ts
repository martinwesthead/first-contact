import { describe, expect, it } from "vitest";
import { validateSite } from "@1stcontact/site-schema";
import { makeMinimalSite } from "./_fixtures_REQ-3_site";

describe("UAT AC-402: duplicate page slugs within a site are rejected", () => {
  it("test_UAT_AC402_duplicate_page_slugs_rejected", () => {
    const site = makeMinimalSite() as Record<string, unknown>;
    const pages = site.pages as Array<Record<string, unknown>>;

    pages.push({
      id: "home-2",
      slug: pages[0].slug,
      title: "Another Home",
      modules: [{ id: "hero-2", type: "hero", version: 1 }],
    });

    const result = validateSite(site);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const paths = result.errors.map((e) => e.path);
      expect(paths).toContain("/pages/1/slug");
      const duplicateError = result.errors.find(
        (e) => e.path === "/pages/1/slug",
      );
      expect(duplicateError?.message).toMatch(/duplicate/i);
    }
  });
});
