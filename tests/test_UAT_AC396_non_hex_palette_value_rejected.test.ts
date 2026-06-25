import { describe, expect, it } from "vitest";
import { validateSite } from "@1stcontact/site-schema";
import { makeMinimalSite } from "./_fixtures_REQ-3_site";

describe("UAT AC-396: non-hex value in palette slot rejected", () => {
  it("test_UAT_AC396_non_hex_palette_value_rejected", () => {
    const badValues = [
      "red",
      "rgb(255,0,0)",
      "hsl(0, 100%, 50%)",
      "#zzz",
      "#12345",
      "primary",
    ];

    for (const value of badValues) {
      const site = makeMinimalSite() as Record<string, unknown>;
      const theme = site.theme as { palette: Record<string, unknown> };
      theme.palette.primary = value;

      const result = validateSite(site);
      expect(result.ok, `value '${value}' should be rejected`).toBe(false);
      if (!result.ok) {
        const paths = result.errors.map((e) => e.path);
        expect(paths, `path for invalid color '${value}'`).toContain(
          "/theme/palette/primary",
        );
      }
    }
  });
});
