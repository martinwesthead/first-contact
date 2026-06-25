import { describe, expect, it } from "vitest";
import { validateSite } from "@1stcontact/site-schema";
import { makeMinimalSite } from "./_fixtures_REQ-3_site";

describe("UAT AC-401: duplicate module IDs within a page are rejected", () => {
  it("test_UAT_AC401_duplicate_module_ids_rejected", () => {
    const site = makeMinimalSite() as Record<string, unknown>;
    const pages = site.pages as Array<{ modules: Array<Record<string, unknown>> }>;

    pages[0].modules.push({
      id: pages[0].modules[0].id,
      type: "text-block",
      version: 1,
    });

    const result = validateSite(site);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const paths = result.errors.map((e) => e.path);
      expect(paths).toContain("/pages/0/modules/1/id");
      const duplicateError = result.errors.find(
        (e) => e.path === "/pages/0/modules/1/id",
      );
      expect(duplicateError?.message).toMatch(/duplicate/i);
    }
  });
});
