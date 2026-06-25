import { describe, expect, it } from "vitest";
import { validateSite } from "@1stcontact/site-schema";
import { makeMinimalSite } from "./_fixtures_REQ-3_site";

describe("UAT AC-395: missing required theme-token slot rejected with JSON-pointer path", () => {
  it("test_UAT_AC395_missing_theme_token_slot_rejected", () => {
    const cases: Array<{ group: string; slot: string; expectedPath: string }> = [
      { group: "palette", slot: "primary", expectedPath: "/theme/palette/primary" },
      { group: "palette", slot: "bg", expectedPath: "/theme/palette/bg" },
      { group: "spacing", slot: "4", expectedPath: "/theme/spacing/4" },
      { group: "radius", slot: "md", expectedPath: "/theme/radius/md" },
      { group: "shadow", slot: "md", expectedPath: "/theme/shadow/md" },
      { group: "container", slot: "default", expectedPath: "/theme/container/default" },
      { group: "breakpoints", slot: "md", expectedPath: "/theme/breakpoints/md" },
    ];

    for (const { group, slot, expectedPath } of cases) {
      const site = makeMinimalSite() as Record<string, unknown>;
      const theme = site.theme as Record<string, Record<string, unknown>>;
      delete theme[group][slot];

      const result = validateSite(site);
      expect(
        result.ok,
        `deleting theme.${group}.${slot} should fail validation`,
      ).toBe(false);
      if (!result.ok) {
        const paths = result.errors.map((e) => e.path);
        expect(paths, `expected path for missing ${group}.${slot}`).toContain(
          expectedPath,
        );
      }
    }
  });
});
