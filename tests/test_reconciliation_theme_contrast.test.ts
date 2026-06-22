import { describe, expect, it, vi } from "vitest";
import {
  contrastRatio,
  defaultThemeTokens,
  evaluateSurfaceContrast,
  generateThemeCss,
  type ContrastPair,
  type SurfaceVariant,
} from "@gendev/framework";
import type { PaletteTokens } from "@gendev/site-schema";

describe("Story story-e53ba4cf: WCAG-AA contrast check over the theme palette", () => {
  it("test_UAT_AC769_contrast_ratio_helper_computes_wcag_luminance_ratio", () => {
    // Black on white is the canonical WCAG maximum: 21:1.
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);

    // A mid-grey pair sits below the 4.5:1 body-text threshold.
    const grey = contrastRatio("#777777", "#999999");
    expect(grey).toBeLessThan(4.5);

    // 3-digit shorthand expands to the same value as its 6-digit form, and a
    // leading '#' is optional.
    expect(contrastRatio("#fff", "#000")).toBeCloseTo(
      contrastRatio("#ffffff", "#000000"),
      5,
    );
    expect(contrastRatio("fff", "000")).toBeCloseTo(
      contrastRatio("#ffffff", "#000000"),
      5,
    );

    // 8-digit hex is accepted (alpha channel ignored for luminance).
    expect(contrastRatio("#000000ff", "#ffffffff")).toBeCloseTo(21, 0);

    // An unparseable hex string is rejected with an error rather than silently
    // returning a bogus ratio.
    expect(() => contrastRatio("not-a-hex", "#000000")).toThrow();
  });

  it("test_UAT_AC770_surface_contrast_evaluator_scores_all_four_rendered_pairs", () => {
    // A palette engineered so exactly one body surface (subtle) fails while the
    // other three pass, exercising both pass and fail outcomes.
    const palette: PaletteTokens = {
      ...defaultThemeTokens.palette,
      bg: "#ffffff",
      text: "#111111",
      surfaceSubtle: "#1a1a1a", // dark subtle bg against dark text → fails 4.5:1
      surfaceInverse: "#0a0a0a", // dark inverse bg against white fg → passes
      accent: "#1a73e8", // medium blue against white → passes 3.0:1
    };

    const pairs = evaluateSurfaceContrast(palette);

    // Exactly one scored pair per rendered surface.
    const bySurface = new Map<SurfaceVariant, ContrastPair>(
      pairs.map((p) => [p.surface, p]),
    );
    expect(pairs).toHaveLength(4);
    expect(new Set(bySurface.keys())).toEqual(
      new Set<SurfaceVariant>(["default", "subtle", "inverse", "accent"]),
    );

    // Each surface uses the bg/fg mapping that matches how it is painted, and
    // the threshold for its text size.
    const def = bySurface.get("default")!;
    expect(def.background).toBe(palette.bg);
    expect(def.foreground).toBe(palette.text);
    expect(def.threshold).toBe(4.5);

    const subtle = bySurface.get("subtle")!;
    expect(subtle.background).toBe(palette.surfaceSubtle);
    expect(subtle.foreground).toBe(palette.text);
    expect(subtle.threshold).toBe(4.5);

    const inverse = bySurface.get("inverse")!;
    expect(inverse.background).toBe(palette.surfaceInverse);
    expect(inverse.foreground).toBe(palette.bg);
    expect(inverse.threshold).toBe(4.5);

    const accent = bySurface.get("accent")!;
    expect(accent.background).toBe(palette.accent);
    expect(accent.foreground).toBe(palette.bg);
    expect(accent.threshold).toBe(3.0);

    // Each pair reports its computed ratio and a pass flag consistent with the
    // ratio/threshold comparison.
    for (const p of pairs) {
      expect(typeof p.ratio).toBe("number");
      expect(p.pass).toBe(p.ratio >= p.threshold);
    }

    // The subtle pair is pushed below threshold and is marked failing; the
    // other three pass.
    expect(subtle.pass).toBe(false);
    expect(def.pass).toBe(true);
    expect(inverse.pass).toBe(true);
    expect(accent.pass).toBe(true);
  });

  it("test_UAT_AC771_stylesheet_emits_contrast_warning_per_failing_surface", () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    try {
      // Clean palette: every surface pair passes → no warning comment, no
      // console.warn.
      const cleanCss = generateThemeCss({
        palette: {
          bg: "#ffffff",
          surface: "#ffffff",
          surfaceSubtle: "#fafafa",
          surfaceInverse: "#0f172a",
          text: "#0f172a",
          muted: "#475569",
          primary: "#1d4ed8",
          accent: "#0f172a",
          border: "#e2e8f0",
        },
      });
      expect(cleanCss).not.toMatch(/fc-contrast-warning/);
      expect(warnSpy).not.toHaveBeenCalled();

      // A palette whose subtle pair fails: a `subtle` warning comment is
      // prepended and the :root block is still emitted unchanged (e.g.
      // --color-bg is present).
      warnSpy.mockClear();
      const subtleCss = generateThemeCss({
        palette: { surfaceSubtle: "#fafafa", text: "#eeeeee" },
      });
      expect(subtleCss).toMatch(/\/\* fc-contrast-warning: subtle[^*]*\*\//);
      expect(subtleCss).toMatch(/:root\s*\{/);
      expect(subtleCss).toMatch(/--color-bg:/);
      // The warning comment precedes the :root block.
      expect(subtleCss.indexOf("fc-contrast-warning")).toBeLessThan(
        subtleCss.indexOf(":root"),
      );

      // A palette where both subtle and accent fail: both surfaces are named
      // (it does not stop at the first), and exactly one console.warn fires
      // naming the failing surfaces.
      warnSpy.mockClear();
      const bothCss = generateThemeCss({
        palette: {
          bg: "#ffffff",
          surfaceSubtle: "#fafafa",
          text: "#eeeeee",
          accent: "#fbbf24",
        },
      });
      expect(bothCss).toMatch(/fc-contrast-warning: subtle/);
      expect(bothCss).toMatch(/fc-contrast-warning: accent/);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      const message = String(warnSpy.mock.calls[0]?.[0]);
      expect(message.toLowerCase()).toContain("contrast");
      expect(message).toContain("subtle");
      expect(message).toContain("accent");
    } finally {
      warnSpy.mockRestore();
    }
  });
});
