import { describe, expect, it } from "vitest";
import { validateSite } from "@1stcontact/site-schema";
import { makeMinimalSite } from "./_fixtures_REQ-3_site";

describe("UAT AC-394: nav pattern outside enum rejected", () => {
  it("test_UAT_AC394_nav_pattern_outside_enum_rejected", () => {
    const site = makeMinimalSite() as Record<string, unknown>;
    (site.nav as Record<string, unknown>).pattern = "snake-bar";

    const result = validateSite(site);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const paths = result.errors.map((e) => e.path);
      expect(paths).toContain("/nav/pattern");
    }

    const allowed = [
      "in-page-anchors",
      "top-tabs",
      "top-tabs-dropdown",
      "hamburger",
      "footer-only",
    ];
    for (const pattern of allowed) {
      const positiveSite = makeMinimalSite() as Record<string, unknown>;
      (positiveSite.nav as Record<string, unknown>).pattern = pattern;
      const positiveResult = validateSite(positiveSite);
      expect(positiveResult.ok, `pattern '${pattern}' should be accepted`).toBe(true);
    }
  });
});
