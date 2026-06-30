import { describe, expect, it } from "vitest";
import {
  mergeComputedSignals,
  NOT_DETECTED,
  type ComputedBoundingBoxes,
  type ComputedStyles,
  type Signals,
} from "../packages/extractor/src/index.js";

/**
 * AC-790: When the rendered fetch runs, the digest's `layout` signal exposes a
 * `boundingBoxes` structure giving the on-page rectangle (x, y, width, height,
 * CSS pixels incl. scroll offset) for the hero region, the nav region, every
 * `section`, and every card. `sections`/`cards` are always arrays (possibly
 * empty); `hero`/`nav` are present only when a matching non-zero element is
 * found. Zero-area / no-layout-box elements are omitted (dropped upstream by
 * the in-page extraction script's `boxOf`, which returns null for width/height
 * ≤ 0, so they never reach the merge). The existing layout fields
 * (maxContentWidth, bias, density) are preserved unchanged alongside
 * `boundingBoxes`. A static-only digest leaves `layout.boundingBoxes` unset.
 */
describe("UAT AC-790: rendered fetch records key-region layout bounding boxes", () => {
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

  it("test_UAT_AC790_records_key_region_bounding_boxes", () => {
    // Bounding boxes as the rendered fetch delivers them: the page has a hero,
    // a nav, two non-empty sections, one card, and a zero-area section. The
    // extraction script's `boxOf` already dropped the zero-area section (its
    // width/height were 0), so only the two real section rects reach the merge.
    const heroRect = { x: 0, y: 0, width: 1440, height: 720 };
    const navRect = { x: 0, y: 0, width: 1440, height: 64 };
    const sectionRectA = { x: 0, y: 720, width: 1440, height: 400 };
    const sectionRectB = { x: 0, y: 1120, width: 1440, height: 380 };
    const cardRect = { x: 100, y: 1200, width: 360, height: 240 };
    const boxes: ComputedBoundingBoxes = {
      hero: heroRect,
      nav: navRect,
      sections: [sectionRectA, sectionRectB], // zero-area section omitted upstream
      cards: [cardRect],
    };

    const merged = mergeComputedSignals(
      baseSignals,
      emptyComputedStyles,
      [],
      "https://acme.test/",
      { boundingBoxes: boxes },
    );

    // boundingBoxes is surfaced on the layout signal.
    expect(merged.layout.boundingBoxes).toBeTruthy();
    const bb = merged.layout.boundingBoxes!;

    // hero and nav carry the expected rects.
    expect(bb.hero).toEqual(heroRect);
    expect(bb.nav).toEqual(navRect);

    // sections lists the two non-empty rects; the zero-area section is omitted.
    expect(bb.sections).toHaveLength(2);
    expect(bb.sections).toEqual([sectionRectA, sectionRectB]);

    // cards lists the single card.
    expect(bb.cards).toHaveLength(1);
    expect(bb.cards[0]).toEqual(cardRect);

    // Existing layout fields are preserved unchanged.
    expect(merged.layout.maxContentWidth).toBe(1024);
    expect(merged.layout.bias).toBe("centered");
    expect(merged.layout.density).toBe("balanced");

    // A static-only digest (no rendered bounding boxes) leaves the field unset.
    const staticOnly = mergeComputedSignals(
      baseSignals,
      emptyComputedStyles,
      [],
      "https://acme.test/",
    );
    expect(staticOnly.layout.boundingBoxes).toBeUndefined();
    expect(staticOnly.layout.maxContentWidth).toBe(1024);
    expect(staticOnly.layout.bias).toBe("centered");
    expect(staticOnly.layout.density).toBe("balanced");
  });
});
