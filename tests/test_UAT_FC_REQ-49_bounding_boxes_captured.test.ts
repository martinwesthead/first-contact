import { describe, expect, it } from "vitest";
import {
  mergeComputedSignals,
  NOT_DETECTED,
  type ComputedBoundingBoxes,
  type ComputedStyles,
  type Signals,
} from "../packages/extractor/src/index.js";

/**
 * REQ-49 AC3 — when the rendered fetch returns bounding boxes for key page
 * regions (hero, nav, sections, cards), mergeComputedSignals surfaces them
 * under signals.layout.boundingBoxes so the AI can reason about layout
 * structure (e.g. "the hero is 1400×600 at the top, three card rectangles
 * stacked below it"). When the rendered fetch is absent, layout.boundingBoxes
 * stays undefined and the existing layout fields are untouched.
 */
describe("UAT FC REQ-49: layout bounding boxes captured at render time", () => {
  const baseSignals: Signals = {
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
    layout: { maxContentWidth: 1024, bias: "centered", density: "balanced" },
    imagery: { imgCount: 0, backgroundCount: 0, videoCount: 0, heroDetected: false },
    content: {
      headings: [],
      navLinks: [],
      formFields: [],
      listGroupCount: 0,
      sectionCount: 0,
    },
    assetInventory: [],
  };

  const emptyComputedStyles: ComputedStyles = {
    body: { family: "", size: "", weight: "", backgroundColor: "" },
    h1: { family: "", size: "", weight: "" },
    h2: { family: "", size: "", weight: "" },
    h3: { family: "", size: "", weight: "" },
    primaryBackgroundColor: "",
  };

  it("AC3: bounding boxes from the driver appear under signals.layout.boundingBoxes, preserving existing layout fields", () => {
    const boxes: ComputedBoundingBoxes = {
      hero: { x: 0, y: 0, width: 1440, height: 720 },
      nav: { x: 0, y: 0, width: 1440, height: 64 },
      sections: [
        { x: 0, y: 720, width: 1440, height: 400 },
        { x: 0, y: 1120, width: 1440, height: 380 },
      ],
      cards: [
        { x: 100, y: 1200, width: 360, height: 240 },
        { x: 500, y: 1200, width: 360, height: 240 },
      ],
    };
    const merged = mergeComputedSignals(
      baseSignals,
      emptyComputedStyles,
      [],
      "https://acme.test/",
      { boundingBoxes: boxes },
    );
    expect(merged.layout.maxContentWidth).toBe(1024);
    expect(merged.layout.bias).toBe("centered");
    expect(merged.layout.density).toBe("balanced");
    expect(merged.layout.boundingBoxes).toBeTruthy();
    expect(merged.layout.boundingBoxes!.hero).toEqual({ x: 0, y: 0, width: 1440, height: 720 });
    expect(merged.layout.boundingBoxes!.nav).toEqual({ x: 0, y: 0, width: 1440, height: 64 });
    expect(merged.layout.boundingBoxes!.sections).toHaveLength(2);
    expect(merged.layout.boundingBoxes!.cards).toHaveLength(2);
  });

  it("AC3: without driver boundingBoxes the merge leaves layout untouched", () => {
    const merged = mergeComputedSignals(
      baseSignals,
      emptyComputedStyles,
      [],
      "https://acme.test/",
    );
    expect(merged.layout.boundingBoxes).toBeUndefined();
    expect(merged.layout.maxContentWidth).toBe(1024);
  });
});
