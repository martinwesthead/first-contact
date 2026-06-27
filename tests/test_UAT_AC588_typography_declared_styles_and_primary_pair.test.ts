import { describe, expect, it } from "vitest";
import { parseTypography, NOT_DETECTED } from "../packages/extractor/src/index.js";

describe("UAT AC-588: typography signals report declared font styles and a primary pair", () => {
  it("test_UAT_AC588_typography_declared_styles_and_primary_pair", () => {
    // (a) Body and heading font properties declared via <style> rules.
    const declaredHtml = `<!doctype html><html><head><style>
      body { font-family: Inter; font-size: 16px; font-weight: 400; }
      h1 { font-family: Poppins; font-size: 48px; font-weight: 700; }
    </style></head><body></body></html>`;
    const typo = parseTypography(declaredHtml, "https://x.test/");

    expect(typo.body.family).toBe("Inter");
    expect(typo.body.size).toBe("16px");
    expect(typo.body.weight).toBe("400");
    expect(typo.h1.family).toBe("Poppins");
    expect(typo.h1.size).toBe("48px");
    expect(typo.h1.weight).toBe("700");

    // primaryPair names the heading and body families.
    expect(typo.primaryPair).not.toBe(NOT_DETECTED);
    if (typo.primaryPair !== NOT_DETECTED) {
      expect(typo.primaryPair.heading).toBe("Poppins");
      expect(typo.primaryPair.body).toBe("Inter");
    }

    // (b) A page with no font declarations.
    const bareHtml = `<!doctype html><html><head></head><body><h1>Hi</h1></body></html>`;
    const bare = parseTypography(bareHtml, "https://x.test/");
    for (const style of [bare.body, bare.h1, bare.h2, bare.h3]) {
      expect(style.family).toBe(NOT_DETECTED);
      expect(style.size).toBe(NOT_DETECTED);
      expect(style.weight).toBe(NOT_DETECTED);
    }
    expect(bare.primaryPair).toBe(NOT_DETECTED);
  });
});
