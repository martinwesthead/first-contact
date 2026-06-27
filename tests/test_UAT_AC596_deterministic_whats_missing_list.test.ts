import { describe, expect, it } from "vitest";
import {
  deriveWhatsMissing,
  extractSignals,
  NOT_DETECTED,
  type Signals,
} from "../packages/extractor/src/index.js";

function fullyPopulatedSignals(): Signals {
  return {
    palette: {
      background: "#ffffff",
      body: "#222222",
      accent: "#16a34a",
      cta: "#2563eb",
      supporting: ["#f3f4f6"],
    },
    typography: {
      body: { family: "Inter", size: "16px", weight: "400" },
      h1: { family: "Poppins", size: "48px", weight: "700" },
      h2: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
      h3: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
      primaryPair: { heading: "Poppins", body: "Inter" },
    },
    layout: { maxContentWidth: 1200, bias: "centered", density: "balanced" },
    imagery: { imgCount: 2, backgroundCount: 1, videoCount: 0, heroDetected: true },
    content: {
      headings: [{ level: 1, text: "Hello" }],
      navLinks: [{ text: "Home", href: "/" }],
      formFields: [],
      listGroupCount: 1,
      sectionCount: 2,
    },
    assetInventory: [],
  };
}

describe("UAT AC-596: a deterministic what's-missing list is produced from absent signals without any AI pass", () => {
  it("test_UAT_AC596_deterministic_whats_missing_list", () => {
    // Sparse signal set (extracted from a near-empty page, no LLM involved).
    const sparse = extractSignals(
      `<!doctype html><html><head></head><body></body></html>`,
      "https://x.test/",
    );
    const missing = deriveWhatsMissing(sparse);
    const joined = missing.join("\n");

    expect(missing.length).toBeGreaterThan(0);
    // A readable entry for each absent major signal category.
    expect(joined).toMatch(/Palette/);
    expect(joined).toMatch(/Typography/);
    expect(joined).toMatch(/Layout/);
    expect(joined).toMatch(/Imagery/);
    expect(joined).toMatch(/Content/);

    // A fully-populated signal set yields an empty list.
    expect(deriveWhatsMissing(fullyPopulatedSignals())).toEqual([]);
  });
});
