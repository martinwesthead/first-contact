import { describe, expect, it } from "vitest";
import { generateThemeCss } from "@gendev/framework";
import { makeThemeTokens } from "./_fixtures_REQ-3_site.js";

describe("UAT FC REQ-4: generateThemeCss emits dark-mode block when dark palette provided", () => {
  it("wraps dark palette in @media (prefers-color-scheme: dark)", () => {
    const css = generateThemeCss(makeThemeTokens(), {
      dark: {
        bg: "#0b1020",
        text: "#f1f5f9",
        surface: "#101529",
      },
    });

    expect(css).toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)/);
    const darkBlock = css.slice(css.indexOf("@media"));
    expect(darkBlock).toContain("--color-bg: #0b1020;");
    expect(darkBlock).toContain("--color-text: #f1f5f9;");
    expect(darkBlock).toContain("--color-surface: #101529;");
  });

  it("omits the dark block entirely when no dark palette is provided", () => {
    const css = generateThemeCss(makeThemeTokens());
    expect(css).not.toContain("prefers-color-scheme");
  });
});
