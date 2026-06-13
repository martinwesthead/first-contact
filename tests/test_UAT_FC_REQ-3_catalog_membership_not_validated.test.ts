import { describe, expect, it } from "vitest";
import { validateSite } from "@1stcontact/site-schema";
import { makeMinimalSite } from "./_fixtures_REQ-3_site";

describe("UAT FC REQ-3: catalog membership not validated by schema", () => {
  it("accepts a site whose module `type` is not in any framework catalog", () => {
    const site = makeMinimalSite() as Record<string, unknown>;
    const pages = site.pages as Array<{ modules: Array<Record<string, unknown>> }>;
    pages[0].modules[0].type = "totally-fake-not-real-module";

    const result = validateSite(site);
    expect(result.ok).toBe(true);
  });

  it("accepts a site whose variant is not declared anywhere", () => {
    const site = makeMinimalSite() as Record<string, unknown>;
    const pages = site.pages as Array<{ modules: Array<Record<string, unknown>> }>;
    pages[0].modules[0].variant = "absurd-variant-name";

    const result = validateSite(site);
    expect(result.ok).toBe(true);
  });

  it("accepts a site whose dial value is not a known enum (catalog enforces, not schema)", () => {
    const site = makeMinimalSite() as Record<string, unknown>;
    const pages = site.pages as Array<{ modules: Array<Record<string, unknown>> }>;
    pages[0].modules[0].dials = { shape: "cirle" };

    const result = validateSite(site);
    expect(result.ok).toBe(true);
  });
});
