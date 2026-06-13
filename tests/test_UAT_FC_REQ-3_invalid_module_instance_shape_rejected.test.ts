import { describe, expect, it } from "vitest";
import { validateSite } from "@1stcontact/site-schema";
import { makeMinimalSite } from "./_fixtures_REQ-3_site";

describe("UAT FC REQ-3: invalid module instance shape rejected", () => {
  it("rejects a ModuleInstance missing `type` and reports the offending path", () => {
    const site = makeMinimalSite() as Record<string, unknown>;
    const pages = site.pages as Array<{ modules: Array<Record<string, unknown>> }>;
    delete pages[0].modules[0].type;

    const result = validateSite(site);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const paths = result.errors.map((e) => e.path);
      expect(paths).toContain("/pages/0/modules/0/type");
    }
  });

  it("rejects a ModuleInstance missing `version` and reports the offending path", () => {
    const site = makeMinimalSite() as Record<string, unknown>;
    const pages = site.pages as Array<{ modules: Array<Record<string, unknown>> }>;
    delete pages[0].modules[0].version;

    const result = validateSite(site);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const paths = result.errors.map((e) => e.path);
      expect(paths).toContain("/pages/0/modules/0/version");
    }
  });
});
