import { describe, expect, it } from "vitest";
import { contrastRatio } from "@gendev/framework";

describe("UAT FC REQ-48: WCAG relative-luminance contrast ratio maths", () => {
  it("returns 21:1 for white on black (the canonical maximum)", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 0);
  });

  it("is symmetric: order of arguments does not change ratio", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(
      contrastRatio("#000000", "#ffffff"),
      5,
    );
  });

  it("returns 1:1 when foreground and background are identical", () => {
    expect(contrastRatio("#888888", "#888888")).toBeCloseTo(1, 2);
  });

  it("accepts 3-digit hex shorthand", () => {
    expect(contrastRatio("#fff", "#000")).toBeCloseTo(21, 0);
  });

  it("flags light grey on white as below WCAG AA (4.5)", () => {
    expect(contrastRatio("#cccccc", "#ffffff")).toBeLessThan(4.5);
  });

  it("flags black on dark navy as above WCAG AA (well above 4.5)", () => {
    expect(contrastRatio("#0f172a", "#ffffff")).toBeGreaterThan(15);
  });
});
