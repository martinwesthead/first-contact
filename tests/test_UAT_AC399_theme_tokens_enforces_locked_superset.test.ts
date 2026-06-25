import { describe, expect, it } from "vitest";
import { validateSite } from "@1stcontact/site-schema";
import { makeMinimalSite, makeThemeTokens } from "./_fixtures_REQ-3_site";

describe("UAT AC-399: theme tokens schema enforces the locked superset", () => {
  it("test_UAT_AC399_theme_tokens_enforces_locked_superset", () => {
    const site = makeMinimalSite();
    site.theme = makeThemeTokens();

    const result = validateSite(site);
    expect(result.ok).toBe(true);

    if (result.ok) {
      const theme = result.value.theme;

      const paletteRoles = [
        "bg",
        "surface",
        "surfaceSubtle",
        "surfaceInverse",
        "text",
        "muted",
        "primary",
        "accent",
        "border",
      ] as const;
      for (const role of paletteRoles) {
        expect(theme.palette[role], `palette role '${role}' present`).toBeDefined();
      }

      const typeScaleSteps = [
        "xs",
        "sm",
        "base",
        "lg",
        "xl",
        "2xl",
        "3xl",
        "4xl",
        "5xl",
      ] as const;
      for (const step of typeScaleSteps) {
        expect(theme.typography.scale[step], `scale step '${step}' present`).toBeDefined();
      }

      const weights = ["regular", "medium", "semibold", "bold", "black"] as const;
      for (const w of weights) {
        expect(theme.typography.weights[w], `weight '${w}' present`).toBeDefined();
      }

      const lineHeights = ["tight", "normal", "relaxed"] as const;
      for (const lh of lineHeights) {
        expect(theme.typography.lineHeights[lh], `lineHeight '${lh}' present`).toBeDefined();
      }
      expect(theme.typography.family.heading.length).toBeGreaterThan(0);
      expect(theme.typography.family.body.length).toBeGreaterThan(0);

      const spacingSteps = ["0", "1", "2", "3", "4", "6", "8", "12", "16", "24"] as const;
      for (const s of spacingSteps) {
        expect(theme.spacing[s], `spacing step '${s}' present`).toBeDefined();
      }

      const radiusSteps = ["none", "sm", "md", "lg", "full"] as const;
      for (const r of radiusSteps) {
        expect(theme.radius[r], `radius step '${r}' present`).toBeDefined();
      }

      const shadowSteps = ["none", "sm", "md", "lg"] as const;
      for (const s of shadowSteps) {
        expect(theme.shadow[s], `shadow step '${s}' present`).toBeDefined();
      }

      const containerSlots = ["narrow", "default", "wide", "bleed"] as const;
      for (const c of containerSlots) {
        expect(theme.container[c], `container slot '${c}' present`).toBeDefined();
      }

      const breakpointSteps = ["sm", "md", "lg", "xl"] as const;
      for (const b of breakpointSteps) {
        expect(theme.breakpoints[b], `breakpoint '${b}' present`).toBeDefined();
      }
    }
  });
});
