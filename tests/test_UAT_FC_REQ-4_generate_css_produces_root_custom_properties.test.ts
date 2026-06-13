import { describe, expect, it } from "vitest";
import { generateThemeCss } from "@1stcontact/framework";
import { makeThemeTokens } from "./_fixtures_REQ-3_site.js";

describe("UAT FC REQ-4: generateThemeCss produces :root custom properties", () => {
  it("emits a :root block containing custom properties for every slot", () => {
    const css = generateThemeCss(makeThemeTokens());

    expect(css).toMatch(/^\s*:root\s*\{/m);
    expect(css).toContain("}");

    // palette (9 roles)
    expect(css).toContain("--color-bg:");
    expect(css).toContain("--color-surface:");
    expect(css).toContain("--color-surface-subtle:");
    expect(css).toContain("--color-surface-inverse:");
    expect(css).toContain("--color-text:");
    expect(css).toContain("--color-muted:");
    expect(css).toContain("--color-primary:");
    expect(css).toContain("--color-accent:");
    expect(css).toContain("--color-border:");

    // typography family + scale + weights + lineHeights
    expect(css).toContain("--font-family-heading:");
    expect(css).toContain("--font-family-body:");
    for (const step of ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl"]) {
      expect(css).toContain(`--font-size-${step}:`);
    }
    for (const w of ["regular", "medium", "semibold", "bold", "black"]) {
      expect(css).toContain(`--font-weight-${w}:`);
    }
    for (const lh of ["tight", "normal", "relaxed"]) {
      expect(css).toContain(`--line-height-${lh}:`);
    }

    // spacing (10 geometric steps)
    for (const s of ["0", "1", "2", "3", "4", "6", "8", "12", "16", "24"]) {
      expect(css).toContain(`--space-${s}:`);
    }

    // radius, shadow, container, breakpoints
    for (const r of ["none", "sm", "md", "lg", "full"]) {
      expect(css).toContain(`--radius-${r}:`);
    }
    for (const sh of ["none", "sm", "md", "lg"]) {
      expect(css).toContain(`--shadow-${sh}:`);
    }
    for (const c of ["narrow", "default", "wide", "bleed"]) {
      expect(css).toContain(`--container-${c}:`);
    }
    for (const bp of ["sm", "md", "lg", "xl"]) {
      expect(css).toContain(`--breakpoint-${bp}:`);
    }
  });

  it("preserves the input values verbatim", () => {
    const tokens = makeThemeTokens();
    tokens.palette.primary = "#abcdef";
    const css = generateThemeCss(tokens);
    expect(css).toContain("--color-primary: #abcdef;");
  });
});
