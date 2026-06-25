import { describe, expect, it } from "vitest";
import { validateSite } from "@1stcontact/site-schema";
import { makeMinimalSite } from "./_fixtures_REQ-3_site";

describe("UAT AC-397: catalog membership is NOT validated (framework's concern)", () => {
  it("test_UAT_AC397_catalog_membership_not_validated", () => {
    const unknownTypeSite = makeMinimalSite() as Record<string, unknown>;
    const utPages = unknownTypeSite.pages as Array<{
      modules: Array<Record<string, unknown>>;
    }>;
    utPages[0].modules[0].type = "totally-fake-module";
    expect(validateSite(unknownTypeSite).ok, "unknown module type accepted").toBe(true);

    const unknownVariantSite = makeMinimalSite() as Record<string, unknown>;
    const uvPages = unknownVariantSite.pages as Array<{
      modules: Array<Record<string, unknown>>;
    }>;
    uvPages[0].modules[0].variant = "absurd-variant-name";
    expect(
      validateSite(unknownVariantSite).ok,
      "undeclared variant accepted",
    ).toBe(true);

    const arbitraryDialSite = makeMinimalSite() as Record<string, unknown>;
    const adPages = arbitraryDialSite.pages as Array<{
      modules: Array<Record<string, unknown>>;
    }>;
    adPages[0].modules[0].dials = { shape: "totally-not-a-real-shape" };
    expect(
      validateSite(arbitraryDialSite).ok,
      "arbitrary dial value accepted",
    ).toBe(true);
  });
});
