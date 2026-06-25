import { describe, expect, it } from "vitest";
import {
  VETTED_FONTS,
  defaultThemeTokens,
  findFontByFamilyDeclaration,
  generateThemeCss,
  googleFontsHref,
  type FontSpec,
} from "@1stcontact/framework";
import { makeThemeTokens } from "./_fixtures_REQ-3_site.js";

describe("Story story-e53ba4cf: theme tokens → CSS custom properties + vetted fonts", () => {
  it("test_UAT_AC403_root_block_contains_custom_property_for_every_locked_slot", () => {
    const css = generateThemeCss(makeThemeTokens());

    // :root block opens and closes
    expect(css).toMatch(/:root\s*\{/);
    expect(css).toMatch(/\}/);

    // 9 palette roles
    const paletteVars = [
      "--color-bg",
      "--color-surface",
      "--color-surface-subtle",
      "--color-surface-inverse",
      "--color-text",
      "--color-muted",
      "--color-primary",
      "--color-accent",
      "--color-border",
    ];
    for (const v of paletteVars) {
      expect(css, `palette var ${v} present`).toContain(`${v}:`);
    }

    // surfaceSubtle / surfaceInverse kebab-cased
    expect(css).toContain("--color-surface-subtle:");
    expect(css).toContain("--color-surface-inverse:");

    // 2 typography families
    expect(css).toContain("--font-family-heading:");
    expect(css).toContain("--font-family-body:");

    // 9 typography scale steps
    for (const step of ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl"]) {
      expect(css).toContain(`--font-size-${step}:`);
    }

    // 5 typography weights
    for (const w of ["regular", "medium", "semibold", "bold", "black"]) {
      expect(css).toContain(`--font-weight-${w}:`);
    }

    // 3 typography line heights
    for (const lh of ["tight", "normal", "relaxed"]) {
      expect(css).toContain(`--line-height-${lh}:`);
    }

    // 10 spacing steps
    for (const s of ["0", "1", "2", "3", "4", "6", "8", "12", "16", "24"]) {
      expect(css).toContain(`--space-${s}:`);
    }

    // 5 radii
    for (const r of ["none", "sm", "md", "lg", "full"]) {
      expect(css).toContain(`--radius-${r}:`);
    }

    // 4 shadows
    for (const sh of ["none", "sm", "md", "lg"]) {
      expect(css).toContain(`--shadow-${sh}:`);
    }

    // 4 containers
    for (const c of ["narrow", "default", "wide", "bleed"]) {
      expect(css).toContain(`--container-${c}:`);
    }

    // 4 breakpoints
    for (const bp of ["sm", "md", "lg", "xl"]) {
      expect(css).toContain(`--breakpoint-${bp}:`);
    }
  });

  it("test_UAT_AC404_supplied_values_appear_verbatim_in_custom_properties", () => {
    const tokens = makeThemeTokens();
    tokens.palette.primary = "#abcdef";
    tokens.spacing["4"] = "1.2rem";
    tokens.typography.family.heading = "'Manrope', system-ui, sans-serif";

    const css = generateThemeCss(tokens);

    expect(css).toContain("--color-primary: #abcdef;");
    expect(css).toContain("--space-4: 1.2rem;");
    expect(css).toContain("--font-family-heading: 'Manrope', system-ui, sans-serif;");
  });

  it("test_UAT_AC405_partial_token_input_fills_unspecified_slots_from_defaults", () => {
    // Partial palette: only primary set
    const cssPalette = generateThemeCss({ palette: { primary: "#ff0000" } });
    expect(cssPalette).toContain("--color-primary: #ff0000;");
    expect(cssPalette).toContain(`--color-bg: ${defaultThemeTokens.palette.bg};`);
    expect(cssPalette).toContain(`--color-text: ${defaultThemeTokens.palette.text};`);
    expect(cssPalette).toContain(`--color-surface: ${defaultThemeTokens.palette.surface};`);

    // Partial spacing: only one step set
    const cssSpacing = generateThemeCss({ spacing: { "4": "1.2rem" } });
    expect(cssSpacing).toContain("--space-4: 1.2rem;");
    expect(cssSpacing).toContain(`--space-0: ${defaultThemeTokens.spacing["0"]};`);
    expect(cssSpacing).toContain(`--space-24: ${defaultThemeTokens.spacing["24"]};`);
  });

  it("test_UAT_AC406_no_input_produces_fully_defaulted_stylesheet", () => {
    const css = generateThemeCss();

    // Every locked slot present with default value
    expect(css).toContain(`--color-bg: ${defaultThemeTokens.palette.bg};`);
    expect(css).toContain(`--color-surface: ${defaultThemeTokens.palette.surface};`);
    expect(css).toContain(`--color-surface-subtle: ${defaultThemeTokens.palette.surfaceSubtle};`);
    expect(css).toContain(`--color-surface-inverse: ${defaultThemeTokens.palette.surfaceInverse};`);
    expect(css).toContain(`--color-text: ${defaultThemeTokens.palette.text};`);
    expect(css).toContain(`--color-muted: ${defaultThemeTokens.palette.muted};`);
    expect(css).toContain(`--color-primary: ${defaultThemeTokens.palette.primary};`);
    expect(css).toContain(`--color-accent: ${defaultThemeTokens.palette.accent};`);
    expect(css).toContain(`--color-border: ${defaultThemeTokens.palette.border};`);

    expect(css).toContain(
      `--font-family-heading: ${defaultThemeTokens.typography.family.heading};`,
    );
    expect(css).toContain(
      `--font-family-body: ${defaultThemeTokens.typography.family.body};`,
    );
    expect(css).toContain(`--space-4: ${defaultThemeTokens.spacing["4"]};`);
    expect(css).toContain(`--container-default: ${defaultThemeTokens.container.default};`);
    expect(css).toContain(`--breakpoint-md: ${defaultThemeTokens.breakpoints.md};`);

    // Defaults describe a light-mode neutral palette: bg/surface are light colors,
    // text is dark.
    expect(defaultThemeTokens.palette.bg.toLowerCase()).toBe("#ffffff");
    const surfaceHex = defaultThemeTokens.palette.surface.toLowerCase();
    // Light surface — hex starts with a high-value byte (>= 0xe0)
    expect(parseInt(surfaceHex.slice(1, 3), 16)).toBeGreaterThanOrEqual(0xe0);
    // Dark text — hex starts with a low-value byte (<= 0x3f)
    const textHex = defaultThemeTokens.palette.text.toLowerCase();
    expect(parseInt(textHex.slice(1, 3), 16)).toBeLessThanOrEqual(0x3f);

    // Default typography families reference system fonts.
    expect(defaultThemeTokens.typography.family.heading).toContain("system-ui");
    expect(defaultThemeTokens.typography.family.body).toContain("system-ui");
  });

  it("test_UAT_AC407_dark_palette_emits_media_block_with_only_supplied_color_roles", () => {
    const css = generateThemeCss(makeThemeTokens(), {
      dark: {
        bg: "#0b1020",
        text: "#f1f5f9",
        surface: "#101529",
      },
    });

    // base :root present
    expect(css).toMatch(/:root\s*\{/);

    // dark @media block present
    expect(css).toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)/);

    // Isolate the dark block to its content between its @media { ... } braces.
    const mediaStart = css.indexOf("@media");
    expect(mediaStart).toBeGreaterThanOrEqual(0);
    const darkBlock = css.slice(mediaStart);

    // The supplied color roles appear in the dark block with the supplied values.
    expect(darkBlock).toContain("--color-bg: #0b1020;");
    expect(darkBlock).toContain("--color-text: #f1f5f9;");
    expect(darkBlock).toContain("--color-surface: #101529;");

    // Only the three supplied color custom properties live inside the dark block —
    // no other color roles, no non-color props.
    const propsInDark = darkBlock.match(/--[a-z0-9-]+:/g) ?? [];
    expect(new Set(propsInDark)).toEqual(
      new Set(["--color-bg:", "--color-text:", "--color-surface:"]),
    );

    // No --color-primary, --font-family-*, --space-*, etc. in the dark block.
    expect(darkBlock).not.toContain("--color-primary:");
    expect(darkBlock).not.toContain("--color-accent:");
    expect(darkBlock).not.toContain("--font-family-");
    expect(darkBlock).not.toContain("--space-");
    expect(darkBlock).not.toContain("--radius-");
    expect(darkBlock).not.toContain("--shadow-");

    // Without a dark palette, no @media block is emitted.
    const cssNoDark = generateThemeCss(makeThemeTokens());
    expect(cssNoDark).not.toContain("prefers-color-scheme");
  });

  it("test_UAT_AC408_vetted_fonts_shortlist_publishes_13_families_with_metadata", () => {
    const expectedFamilies = [
      "Inter",
      "Manrope",
      "Fraunces",
      "Playfair Display",
      "Space Grotesk",
      "DM Serif Display",
      "Outfit",
      "Sora",
      "Source Sans 3",
      "IBM Plex Sans",
      "Lora",
      "Merriweather",
      "Work Sans",
    ];

    const families = VETTED_FONTS.map((f) => f.family);
    expect(families).toHaveLength(13);
    expect(new Set(families)).toEqual(new Set(expectedFamilies));

    // Each entry exposes stable metadata.
    for (const spec of VETTED_FONTS) {
      expect(spec.id, `id present for ${spec.family}`).toMatch(/^[a-z0-9-]+$/);
      expect(spec.family.length).toBeGreaterThan(0);
      expect(spec.googleFamily.length).toBeGreaterThan(0);
      expect(spec.weights.length).toBeGreaterThan(0);
      expect(["display", "body"]).toContain(spec.category);
    }

    // Spaces in family names are encoded with '+' for Google Fonts URLs.
    const playfair = VETTED_FONTS.find((f) => f.family === "Playfair Display");
    expect(playfair).toBeDefined();
    expect(playfair!.googleFamily).toBe("Playfair+Display");
    expect(playfair!.category).toBe("display");
    expect(playfair!.weights.length).toBeGreaterThan(0);

    const workSans = VETTED_FONTS.find((f) => f.family === "Work Sans");
    expect(workSans).toBeDefined();
    expect(workSans!.googleFamily).toBe("Work+Sans");
    expect(workSans!.category).toBe("body");
    expect(workSans!.weights.length).toBeGreaterThan(0);
  });

  it("test_UAT_AC409_font_family_declaration_resolves_case_insensitively_ignoring_quotes", () => {
    // Quoted primary family in a stack
    const manrope = findFontByFamilyDeclaration("'Manrope', system-ui, sans-serif");
    expect(manrope).toBeDefined();
    expect(manrope!.family).toBe("Manrope");

    // Double-quoted primary family
    const manropeDQ = findFontByFamilyDeclaration('"Manrope", system-ui, sans-serif');
    expect(manropeDQ).toBeDefined();
    expect(manropeDQ!.family).toBe("Manrope");

    // No surrounding quotes
    const inter = findFontByFamilyDeclaration("Inter, sans-serif");
    expect(inter).toBeDefined();
    expect(inter!.family).toBe("Inter");

    // Mixed/lower case
    const interLower = findFontByFamilyDeclaration("inter, sans-serif");
    expect(interLower).toBeDefined();
    expect(interLower!.family).toBe("Inter");

    const interUpper = findFontByFamilyDeclaration("INTER");
    expect(interUpper).toBeDefined();
    expect(interUpper!.family).toBe("Inter");

    // Multi-word family resolves case-insensitively
    const playfair = findFontByFamilyDeclaration("'playfair display', serif");
    expect(playfair).toBeDefined();
    expect(playfair!.family).toBe("Playfair Display");

    // Primary family not on the shortlist returns undefined (no error).
    const missing = findFontByFamilyDeclaration("'Comic Sans MS', sans-serif");
    expect(missing).toBeUndefined();
  });

  it("test_UAT_AC410_google_fonts_url_lists_each_family_with_weights_and_display_swap", () => {
    const inter = VETTED_FONTS.find((f) => f.family === "Inter")!;
    const manrope = VETTED_FONTS.find((f) => f.family === "Manrope")!;

    // Single spec
    const single = googleFontsHref([inter]);
    expect(single).toBeDefined();
    expect(single!.startsWith("https://fonts.googleapis.com/css2?")).toBe(true);
    expect(single!).toContain(`family=${inter.googleFamily}:wght@${inter.weights.join(";")}`);
    expect(single!).toContain("display=swap");
    // Only one display=swap parameter
    expect(single!.match(/display=swap/g)).toHaveLength(1);

    // Multiple specs — order preserved
    const multi = googleFontsHref([manrope, inter]);
    expect(multi).toBeDefined();
    expect(multi!.startsWith("https://fonts.googleapis.com/css2?")).toBe(true);
    expect(multi!).toContain(
      `family=${manrope.googleFamily}:wght@${manrope.weights.join(";")}`,
    );
    expect(multi!).toContain(
      `family=${inter.googleFamily}:wght@${inter.weights.join(";")}`,
    );
    // Two family= params
    expect(multi!.match(/family=/g)).toHaveLength(2);
    // Single display=swap
    expect(multi!.match(/display=swap/g)).toHaveLength(1);
    // Order: manrope appears before inter
    expect(multi!.indexOf(manrope.googleFamily)).toBeLessThan(
      multi!.indexOf(inter.googleFamily),
    );

    // Empty input — no URL produced
    const empty = googleFontsHref([] as readonly FontSpec[]);
    expect(empty).toBeUndefined();
  });
});
