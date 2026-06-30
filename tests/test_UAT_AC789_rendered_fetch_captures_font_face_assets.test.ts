import { describe, expect, it } from "vitest";
import {
  COMPUTED_EXTRACTION_SCRIPT,
  mergeComputedSignals,
  NOT_DETECTED,
  type ComputedBackgroundAsset,
  type ComputedFontAsset,
  type ComputedStyles,
  type Signals,
} from "../packages/extractor/src/index.js";

/**
 * AC-789: When the rendered fetch runs against a page declaring `@font-face`
 * web fonts (via document.styleSheets CSSFontFaceRule entries or the
 * document.fonts Font Loading API), every font-file url() is folded into the
 * asset inventory as a `kind: 'font'` record, resolved to an absolute URL
 * (against the rendered page's URL) with the originating font family recorded.
 * URLs are deduped by absolute URL: a URL already present has its `references`
 * count incremented and keeps its original `kind` (no duplicate row); a new URL
 * is appended with `references` = 1. `data:` font URLs are excluded. A
 * static-only digest gains no `kind: 'font'` records from this path.
 *
 * Two boundaries are exercised, matching where each behaviour lives in the
 * code: the in-page extraction script (`COMPUTED_EXTRACTION_SCRIPT`) is where
 * `@font-face` url()s are discovered and `data:` URLs are filtered out before
 * they ever reach the merge; `mergeComputedSignals` is where the discovered
 * (data-free) font assets are folded into the inventory with dedup/resolution.
 */
describe("UAT AC-789: rendered fetch captures @font-face web-font URLs as font assets", () => {
  const baseSignals = (): Signals => ({
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
    imagery: { imgCount: 1, backgroundCount: 0, videoCount: 0, heroDetected: false },
    content: {
      headings: [],
      navLinks: [],
      formFields: [],
      listGroupCount: 0,
      sectionCount: 0,
    },
    // Pre-existing record whose URL one of the rendered font url()s collides
    // with. It is deliberately kind:'img' (not 'font') so the test proves the
    // merge keeps the FIRST-discovered kind on a dedup, rather than overwriting
    // it to 'font'.
    assetInventory: [
      {
        url: "https://cdn.acme.test/shared/brand.woff2",
        kind: "img",
        classification: "unknown",
        references: 1,
      },
    ],
  });

  const computedStyles: ComputedStyles = {
    body: { family: "Inter", size: "16px", weight: "400", backgroundColor: "rgb(255,255,255)" },
    h1: { family: "Playfair", size: "48px", weight: "700" },
    h2: { family: "", size: "", weight: "" },
    h3: { family: "", size: "", weight: "" },
    primaryBackgroundColor: "rgb(255,255,255)",
  };
  const noBackgrounds: ComputedBackgroundAsset[] = [];
  const baseUrl = "https://acme.test/page";

  it("test_UAT_AC789_captures_font_face_urls_as_font_assets", () => {
    // ── (c) data: exclusion lives in the in-page extraction script ──────────
    // Run COMPUTED_EXTRACTION_SCRIPT against a minimal stubbed DOM whose single
    // @font-face declares both a real web-font url() and a data: url(). The
    // script must surface the real URL and drop the data: one — that is the
    // (data-free) ComputedFontAsset[] the driver hands to the merge.
    const fontFaceRule = {
      type: 5, // CSSFontFaceRule
      style: {
        getPropertyValue: (prop: string) =>
          prop === "src"
            ? "url(https://fonts.test/AcmeSans.woff2) format('woff2'), url(data:font/woff2;base64,AAAA) format('woff2')"
            : prop === "font-family"
              ? "Acme Sans"
              : "",
      },
    };
    const stubDocument = {
      body: {},
      querySelector: () => null,
      querySelectorAll: () => [] as unknown[],
      styleSheets: [{ cssRules: [fontFaceRule] }],
      fonts: undefined,
    };
    const stubWindow = { innerHeight: 900, innerWidth: 1440, scrollX: 0, scrollY: 0 };
    const getComputedStyleStub = () => ({
      fontFamily: "",
      fontSize: "",
      fontWeight: "",
      backgroundColor: "",
      backgroundImage: "none",
    });
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const runExtraction = new Function(
      "document",
      "window",
      "getComputedStyle",
      `return ${COMPUTED_EXTRACTION_SCRIPT.trim()}`,
    ) as (
      d: unknown,
      w: unknown,
      g: unknown,
    ) => { fontAssets: { url: string; family: string }[] };
    const scriptOut = runExtraction(stubDocument, stubWindow, getComputedStyleStub);

    expect(
      scriptOut.fontAssets.map((f) => f.url),
    ).toContain("https://fonts.test/AcmeSans.woff2");
    // The data: url() is filtered out by the script — never reaches the merge.
    expect(scriptOut.fontAssets.some((f) => f.url.startsWith("data:"))).toBe(false);
    const discoveredFamily = scriptOut.fontAssets.find(
      (f) => f.url === "https://fonts.test/AcmeSans.woff2",
    )?.family;
    expect(discoveredFamily).toBe("Acme Sans");

    // ── merge folds discovered (data-free) font assets into the inventory ───
    const fontAssets: ComputedFontAsset[] = [
      // (a) new absolute web-font url() with a known family.
      { url: "https://fonts.gstatic.com/s/playfair/v1/Playfair.woff2", family: "Playfair" },
      // (a') new relative url() — resolved against the rendered page's URL.
      { url: "/fonts/local.woff2", family: "Local" },
      // (b) duplicate of a URL already in the inventory (kind:'img').
      { url: "https://cdn.acme.test/shared/brand.woff2", family: "Brand" },
    ];

    const merged = mergeComputedSignals(
      baseSignals(),
      computedStyles,
      noBackgrounds,
      baseUrl,
      { fontAssets },
    );

    // (a) The new web-font URL appears exactly once as kind:'font', absolute,
    // references=1, with the family recorded (on `alt`).
    const playfair = merged.assetInventory.filter(
      (a) => a.url === "https://fonts.gstatic.com/s/playfair/v1/Playfair.woff2",
    );
    expect(playfair).toHaveLength(1);
    expect(playfair[0].kind).toBe("font");
    expect(playfair[0].references).toBe(1);
    expect(playfair[0].alt).toBe("Playfair");

    // (a') The relative URL is resolved to an absolute URL against the page.
    const local = merged.assetInventory.filter(
      (a) => a.url === "https://acme.test/fonts/local.woff2",
    );
    expect(local).toHaveLength(1);
    expect(local[0].kind).toBe("font");
    expect(local[0].alt).toBe("Local");

    // (b) The duplicate URL increments references on the existing record and
    // keeps its original kind — no new row, kind stays 'img'.
    const brand = merged.assetInventory.filter(
      (a) => a.url === "https://cdn.acme.test/shared/brand.woff2",
    );
    expect(brand).toHaveLength(1);
    expect(brand[0].kind).toBe("img");
    expect(brand[0].references).toBe(2);

    // Exactly two genuinely-new kind:'font' records were added (Playfair, Local).
    expect(merged.assetInventory.filter((a) => a.kind === "font")).toHaveLength(2);

    // Fonts do not inflate the imagery background count.
    expect(merged.imagery.backgroundCount).toBe(0);

    // Static-only path: with no rendered font assets supplied, no kind:'font'
    // records are added — the inventory keeps only its pre-existing record.
    const staticOnly = mergeComputedSignals(
      baseSignals(),
      computedStyles,
      noBackgrounds,
      baseUrl,
    );
    expect(staticOnly.assetInventory.filter((a) => a.kind === "font")).toHaveLength(0);
    expect(staticOnly.assetInventory).toHaveLength(1);
  });
});
