import { describe, expectTypeOf, it, expect } from "vitest";
import { validateSite, type Site } from "@gendev/site-schema";
import { makeMinimalSite } from "./_fixtures_REQ-3_site";

describe("UAT FC REQ-3: validator returns typed Site", () => {
  it("narrows the value to Site on success (compile-time)", () => {
    const result = validateSite(makeMinimalSite());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expectTypeOf(result.value).toEqualTypeOf<Site>();
      expectTypeOf(result.value.pages).toBeArray();
      expectTypeOf(result.value.pages[0].modules[0].type).toBeString();
    }
  });

  it("narrows the errors branch to ValidationError[] on failure (compile-time)", () => {
    const result = validateSite({ totally: "wrong" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expectTypeOf(result.errors).toBeArray();
      expectTypeOf(result.errors[0].path).toBeString();
      expectTypeOf(result.errors[0].message).toBeString();
    }
  });
});
