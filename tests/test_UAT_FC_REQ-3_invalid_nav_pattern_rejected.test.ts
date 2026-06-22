import { describe, expect, it } from "vitest";
import { validateSite } from "@gendev/site-schema";
import { makeMinimalSite } from "./_fixtures_REQ-3_site";

describe("UAT FC REQ-3: invalid nav pattern rejected", () => {
  it("rejects a nav pattern not in the enum", () => {
    const site = makeMinimalSite() as Record<string, unknown>;
    (site.nav as Record<string, unknown>).pattern = "snake-bar";

    const result = validateSite(site);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const navPatternErrors = result.errors.filter(
        (e) => e.path === "/nav/pattern",
      );
      expect(navPatternErrors.length).toBeGreaterThan(0);
    }
  });
});
