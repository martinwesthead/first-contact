import { describe, expect, it } from "vitest";
import { defaultThemeTokens, evaluateSurfaceContrast } from "@gendev/framework";

describe("UAT FC REQ-48: surface-pair contrast evaluation", () => {
  it("returns one entry per module surface variant (default/subtle/inverse/accent)", () => {
    const pairs = evaluateSurfaceContrast(defaultThemeTokens.palette);
    const surfaces = pairs.map((p) => p.surface).sort();
    expect(surfaces).toEqual(["accent", "default", "inverse", "subtle"]);
  });

  it("default surface uses palette.bg as background and palette.text as foreground", () => {
    const pairs = evaluateSurfaceContrast(defaultThemeTokens.palette);
    const def = pairs.find((p) => p.surface === "default");
    expect(def).toBeDefined();
    expect(def!.background.toLowerCase()).toBe(
      defaultThemeTokens.palette.bg.toLowerCase(),
    );
    expect(def!.foreground.toLowerCase()).toBe(
      defaultThemeTokens.palette.text.toLowerCase(),
    );
  });

  it("inverse surface uses surfaceInverse as background and bg as foreground", () => {
    const pairs = evaluateSurfaceContrast(defaultThemeTokens.palette);
    const inv = pairs.find((p) => p.surface === "inverse");
    expect(inv).toBeDefined();
    expect(inv!.background.toLowerCase()).toBe(
      defaultThemeTokens.palette.surfaceInverse.toLowerCase(),
    );
    expect(inv!.foreground.toLowerCase()).toBe(
      defaultThemeTokens.palette.bg.toLowerCase(),
    );
  });

  it("accent surface uses accent as background and bg as foreground", () => {
    const pairs = evaluateSurfaceContrast(defaultThemeTokens.palette);
    const acc = pairs.find((p) => p.surface === "accent");
    expect(acc).toBeDefined();
    expect(acc!.background.toLowerCase()).toBe(
      defaultThemeTokens.palette.accent.toLowerCase(),
    );
    expect(acc!.foreground.toLowerCase()).toBe(
      defaultThemeTokens.palette.bg.toLowerCase(),
    );
  });

  it("assigns body-text threshold (4.5) to default and subtle surfaces", () => {
    const pairs = evaluateSurfaceContrast(defaultThemeTokens.palette);
    expect(pairs.find((p) => p.surface === "default")!.threshold).toBe(4.5);
    expect(pairs.find((p) => p.surface === "subtle")!.threshold).toBe(4.5);
  });

  it("flags a surface whose ratio is below threshold", () => {
    const palette = {
      ...defaultThemeTokens.palette,
      surfaceSubtle: "#fafafa",
      text: "#eeeeee",
    };
    const pairs = evaluateSurfaceContrast(palette);
    const subtle = pairs.find((p) => p.surface === "subtle")!;
    expect(subtle.pass).toBe(false);
    expect(subtle.ratio).toBeLessThan(4.5);
  });

  it("passes when text is dark on light surface", () => {
    const palette = {
      ...defaultThemeTokens.palette,
      surfaceSubtle: "#fafafa",
      text: "#0f172a",
    };
    const pairs = evaluateSurfaceContrast(palette);
    expect(pairs.find((p) => p.surface === "subtle")!.pass).toBe(true);
  });
});
