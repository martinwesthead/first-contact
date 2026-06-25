import { describe, expect, it } from "vitest";
import { validateSite } from "@1stcontact/site-schema";
import { makeMinimalSite } from "./_fixtures_REQ-3_site";

describe("UAT AC-393: module instance missing required field rejected with JSON-pointer path", () => {
  it("test_UAT_AC393_module_instance_missing_required_field_rejected", () => {
    const cases: Array<{ field: "type" | "version" | "id"; expectedPath: string }> = [
      { field: "type", expectedPath: "/pages/0/modules/0/type" },
      { field: "version", expectedPath: "/pages/0/modules/0/version" },
      { field: "id", expectedPath: "/pages/0/modules/0/id" },
    ];

    for (const { field, expectedPath } of cases) {
      const site = makeMinimalSite() as Record<string, unknown>;
      const pages = site.pages as Array<{ modules: Array<Record<string, unknown>> }>;
      delete pages[0].modules[0][field];

      const result = validateSite(site);
      expect(result.ok, `missing '${field}' should fail validation`).toBe(false);
      if (!result.ok) {
        const paths = result.errors.map((e) => e.path);
        expect(paths, `path for missing '${field}'`).toContain(expectedPath);
        const matching = result.errors.find((e) => e.path === expectedPath);
        expect(typeof matching?.message).toBe("string");
        expect((matching?.message ?? "").length).toBeGreaterThan(0);
      }
    }
  });
});
