import { describe, expect, it } from "vitest";
import {
  mergeComputedSignals,
  NOT_DETECTED,
  type ComputedBackgroundAsset,
  type ComputedFontAsset,
  type ComputedStyles,
  type Signals,
} from "../packages/extractor/src/index.js";

/**
 * REQ-49 AC2 — when the rendered fetch surfaces @font-face / document.fonts
 * URLs, mergeComputedSignals folds them into the digest's assetInventory as
 * kind='font' AssetRecords, with the family on `alt`. Existing entries (same
 * URL) just bump references rather than duplicating; URLs are resolved
 * against the page's base URL when relative.
 */
describe("UAT FC REQ-49: @font-face URLs land in assetInventory as kind='font'", () => {
  it("AC2: rendered-time computedFontAssets are merged as kind='font' AssetRecords; existing URLs bump references; family appears on `alt`", () => {
    const baseSignals: Signals = {
      palette: {
        background: "rgb(255,255,255)",
        body: "rgb(0,0,0)",
        accent: NOT_DETECTED,
        cta: NOT_DETECTED,
        supporting: [],
      },
      typography: {
        body: { family: "Inter", size: "16px", weight: "400" },
        h1: { family: "Playfair", size: "48px", weight: "700" },
        h2: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
        h3: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
        primaryPair: { body: "Inter", heading: "Playfair" },
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
      // Pre-existing font URL that will collide with one of the rendered ones.
      assetInventory: [
        {
          url: "https://fonts.gstatic.com/s/inter/v1/Inter.woff2",
          kind: "font",
          classification: "unknown",
          references: 1,
        },
      ],
    };

    const computedStyles: ComputedStyles = {
      body: { family: "Inter", size: "16px", weight: "400", backgroundColor: "rgb(255,255,255)" },
      h1: { family: "Playfair", size: "48px", weight: "700" },
      h2: { family: "", size: "", weight: "" },
      h3: { family: "", size: "", weight: "" },
      primaryBackgroundColor: "rgb(255,255,255)",
    };
    const backgrounds: ComputedBackgroundAsset[] = [];
    const fontAssets: ComputedFontAsset[] = [
      // Duplicate of an existing entry — should bump references.
      { url: "https://fonts.gstatic.com/s/inter/v1/Inter.woff2", family: "Inter" },
      // New absolute URL.
      { url: "https://fonts.gstatic.com/s/playfair/v1/Playfair.woff2", family: "Playfair" },
      // Relative URL — must be resolved against the page base.
      { url: "/fonts/local.woff2", family: "Local" },
    ];

    const merged = mergeComputedSignals(
      baseSignals,
      computedStyles,
      backgrounds,
      "https://acme.test/page",
      { fontAssets },
    );

    const fonts = merged.assetInventory.filter((a) => a.kind === "font");
    const interEntry = fonts.find(
      (a) => a.url === "https://fonts.gstatic.com/s/inter/v1/Inter.woff2",
    );
    const playfairEntry = fonts.find(
      (a) => a.url === "https://fonts.gstatic.com/s/playfair/v1/Playfair.woff2",
    );
    const localEntry = fonts.find((a) => a.url === "https://acme.test/fonts/local.woff2");

    expect(interEntry).toBeTruthy();
    expect(interEntry!.references).toBe(2); // bumped from 1 by the duplicate

    expect(playfairEntry).toBeTruthy();
    expect(playfairEntry!.references).toBe(1);
    expect(playfairEntry!.alt).toBe("Playfair");

    expect(localEntry).toBeTruthy();
    expect(localEntry!.alt).toBe("Local");

    // Fonts must NOT inflate the imagery backgroundCount.
    expect(merged.imagery.backgroundCount).toBe(0);
  });
});
