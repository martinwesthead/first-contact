import { describe, expect, it } from "vitest";
import { defaultThemeTokens, generateThemeCss } from "@1stcontact/framework";

describe("UAT FC REQ-4: generateThemeCss substitutes defaults for missing slots", () => {
  it("fills missing palette slots from defaults when input is partial", () => {
    const css = generateThemeCss({
      palette: { primary: "#ff0000" },
    });

    expect(css).toContain("--color-primary: #ff0000;");
    expect(css).toContain(`--color-bg: ${defaultThemeTokens.palette.bg};`);
    expect(css).toContain(`--color-text: ${defaultThemeTokens.palette.text};`);
  });

  it("returns the full default CSS when called with no tokens", () => {
    const css = generateThemeCss();
    expect(css).toContain(`--color-bg: ${defaultThemeTokens.palette.bg};`);
    expect(css).toContain(
      `--font-family-heading: ${defaultThemeTokens.typography.family.heading};`,
    );
    expect(css).toContain(`--space-4: ${defaultThemeTokens.spacing["4"]};`);
    expect(css).toContain(
      `--container-default: ${defaultThemeTokens.container.default};`,
    );
  });

  it("merges nested partials without dropping sibling defaults", () => {
    const css = generateThemeCss({
      spacing: { "4": "1.2rem" },
    });
    expect(css).toContain("--space-4: 1.2rem;");
    expect(css).toContain(`--space-0: ${defaultThemeTokens.spacing["0"]};`);
    expect(css).toContain(`--space-24: ${defaultThemeTokens.spacing["24"]};`);
  });
});
