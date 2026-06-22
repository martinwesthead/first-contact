import { describe, expect, it } from "vitest";
import { validateSite } from "@gendev/site-schema";
import { makeMinimalSite } from "./_fixtures_REQ-3_site";

describe("UAT FC REQ-3: invalid color format rejected", () => {
  it("rejects a non-hex value in a color token slot", () => {
    const site = makeMinimalSite() as Record<string, unknown>;
    const theme = site.theme as { palette: Record<string, unknown> };
    theme.palette.primary = "red";

    const result = validateSite(site);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const paths = result.errors.map((e) => e.path);
      expect(paths).toContain("/theme/palette/primary");
    }
  });

  it("accepts canonical hex shapes #rgb / #rrggbb / #rrggbbaa", () => {
    const cases = ["#abc", "#aabbcc", "#aabbccdd"];
    for (const hex of cases) {
      const site = makeMinimalSite() as Record<string, unknown>;
      const theme = site.theme as { palette: Record<string, unknown> };
      theme.palette.primary = hex;
      const result = validateSite(site);
      expect(result.ok).toBe(true);
    }
  });
});
