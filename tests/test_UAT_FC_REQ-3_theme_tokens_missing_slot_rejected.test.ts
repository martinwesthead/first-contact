import { describe, expect, it } from "vitest";
import { validateSite } from "@1stcontact/site-schema";
import { makeMinimalSite } from "./_fixtures_REQ-3_site";

describe("UAT FC REQ-3: theme tokens missing slot rejected", () => {
  it("rejects when a required palette slot is omitted and names the slot in the error path", () => {
    const site = makeMinimalSite() as Record<string, unknown>;
    const theme = site.theme as { palette: Record<string, unknown> };
    delete theme.palette.primary;

    const result = validateSite(site);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const paths = result.errors.map((e) => e.path);
      expect(paths).toContain("/theme/palette/primary");
    }
  });

  it("rejects when a required spacing slot is omitted", () => {
    const site = makeMinimalSite() as Record<string, unknown>;
    const theme = site.theme as { spacing: Record<string, unknown> };
    delete theme.spacing.md;

    const result = validateSite(site);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const paths = result.errors.map((e) => e.path);
      expect(paths).toContain("/theme/spacing/md");
    }
  });
});
