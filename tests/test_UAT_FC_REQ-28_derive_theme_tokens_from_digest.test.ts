import { describe, expect, it } from "vitest";
import {
  NOT_DETECTED,
  SCHEMA_VERSION,
  type ReferenceDigest,
} from "../packages/extractor/src/index.js";
import {
  applyTokenPatch,
  deriveThemeTokens,
} from "../packages/extractor/src/transcribe.js";
import { defaultThemeTokens } from "../packages/framework/src/tokens/defaults.js";

function makeDigest(overrides: Partial<ReferenceDigest> = {}): ReferenceDigest {
  return {
    schemaVersion: SCHEMA_VERSION,
    sourceUrl: "https://example.com/",
    fetchedAt: "2026-06-18T00:00:00.000Z",
    fetchPath: "static",
    summary: "test digest",
    signals: {
      palette: {
        background: NOT_DETECTED,
        body: NOT_DETECTED,
        accent: NOT_DETECTED,
        cta: NOT_DETECTED,
        supporting: [],
      },
      typography: {
        body: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
        h1: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
        h2: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
        h3: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
        primaryPair: NOT_DETECTED,
      },
      layout: { maxContentWidth: NOT_DETECTED, bias: NOT_DETECTED, density: NOT_DETECTED },
      imagery: { imgCount: 0, backgroundCount: 0, videoCount: 0, heroDetected: false },
      content: {
        headings: [],
        navLinks: [],
        formFields: [],
        listGroupCount: 0,
        sectionCount: 0,
      },
      assetInventory: [],
    },
    commentary: { perSection: {}, whatsMissing: [] },
    screenshotKeys: {},
    ...overrides,
  };
}

describe("UAT FC REQ-28: deriveThemeTokens deterministically maps palette + typography signals", () => {
  it("AC13: returns default tokens unchanged when palette and typography are not_detected", () => {
    const digest = makeDigest();
    const patch = deriveThemeTokens(digest);
    expect(patch.palette).toEqual({});
    expect(patch.typography.family).toEqual({});
    expect(patch.confidence.palette).toBe("low");
    expect(patch.confidence.typography).toBe("low");

    const tokens = applyTokenPatch(patch);
    expect(tokens.palette).toEqual(defaultThemeTokens.palette);
    expect(tokens.typography.family).toEqual(defaultThemeTokens.typography.family);
  });

  it("maps palette role inference 1:1 to ThemeTokens palette slots with high confidence", () => {
    const digest = makeDigest({
      signals: {
        ...makeDigest().signals,
        palette: {
          background: "#FFFFFF",
          body: "#222222",
          accent: "#16A34A",
          cta: "#2563EB",
          supporting: [],
        },
      },
    });
    const patch = deriveThemeTokens(digest);
    expect(patch.palette.bg).toBe("#ffffff");
    expect(patch.palette.text).toBe("#222222");
    expect(patch.palette.accent).toBe("#16a34a");
    expect(patch.palette.primary).toBe("#2563eb");
    expect(patch.confidence.palette).toBe("high");

    const tokens = applyTokenPatch(patch);
    expect(tokens.palette.bg).toBe("#ffffff");
    expect(tokens.palette.primary).toBe("#2563eb");
    // Defaults preserved for slots the digest didn't supply (surface, etc.).
    expect(tokens.palette.surface).toBe(defaultThemeTokens.palette.surface);
  });

  it("medium-confidence palette when 1–2 roles are detected", () => {
    const digest = makeDigest({
      signals: {
        ...makeDigest().signals,
        palette: {
          background: "#FFFFFF",
          body: NOT_DETECTED,
          accent: NOT_DETECTED,
          cta: NOT_DETECTED,
          supporting: [],
        },
      },
    });
    const patch = deriveThemeTokens(digest);
    expect(patch.confidence.palette).toBe("medium");
  });

  it("maps primaryPair to typography.family with high confidence", () => {
    const digest = makeDigest({
      signals: {
        ...makeDigest().signals,
        typography: {
          body: { family: "Inter", size: NOT_DETECTED, weight: NOT_DETECTED },
          h1: { family: "Playfair Display", size: NOT_DETECTED, weight: NOT_DETECTED },
          h2: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          h3: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          primaryPair: { body: "Inter", heading: "Playfair Display" },
        },
      },
    });
    const patch = deriveThemeTokens(digest);
    expect(patch.typography.family).toEqual({
      body: "Inter",
      heading: "Playfair Display",
    });
    expect(patch.confidence.typography).toBe("high");

    const tokens = applyTokenPatch(patch);
    expect(tokens.typography.family.body).toBe("Inter");
    expect(tokens.typography.family.heading).toBe("Playfair Display");
    // Other typography slots fall back to default.
    expect(tokens.typography.scale.base).toBe(defaultThemeTokens.typography.scale.base);
  });

  it("falls back to h1 / h2 family for heading when primaryPair is not_detected", () => {
    const digest = makeDigest({
      signals: {
        ...makeDigest().signals,
        typography: {
          body: { family: "system-ui", size: NOT_DETECTED, weight: NOT_DETECTED },
          h1: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          h2: { family: "Georgia", size: NOT_DETECTED, weight: NOT_DETECTED },
          h3: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          primaryPair: NOT_DETECTED,
        },
      },
    });
    const patch = deriveThemeTokens(digest);
    expect(patch.typography.family.body).toBe("system-ui");
    expect(patch.typography.family.heading).toBe("Georgia");
    expect(patch.confidence.typography).toBe("medium");
  });

  it("normalizes hex colors to lowercase with leading # always present", () => {
    const digest = makeDigest({
      signals: {
        ...makeDigest().signals,
        palette: {
          background: "ABCDEF",
          body: "#0F172A",
          accent: NOT_DETECTED,
          cta: NOT_DETECTED,
          supporting: [],
        },
      },
    });
    const patch = deriveThemeTokens(digest);
    expect(patch.palette.bg).toBe("#abcdef");
    expect(patch.palette.text).toBe("#0f172a");
  });
});
