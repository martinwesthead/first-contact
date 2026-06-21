/**
 * renderedFetch — Layer A escalation path that drives Browser Rendering
 * (via @cloudflare/puppeteer at the binding boundary). The extractor stays
 * pure: it defines the `BrowserDriver` interface and the in-page extraction
 * script. The control-app supplies a concrete driver that wraps puppeteer.
 *
 * Tests inject a fake driver that returns deterministic computed-style and
 * screenshot data without ever spinning up a real browser instance.
 */

export type ViewportName = "mobile" | "tablet" | "desktop";

export interface Viewport {
  readonly name: ViewportName;
  readonly width: number;
  readonly height: number;
}

/**
 * Viewport choices documented on REQ-22:
 *   - mobile  390×844  (iPhone 13 reference, portrait)
 *   - tablet  820×1180 (iPad Air reference, portrait)
 *   - desktop 1440×900 (mainstream laptop reference)
 */
export const DEFAULT_VIEWPORTS: readonly Viewport[] = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
];

export interface ComputedTypeStyle {
  readonly family: string;
  readonly size: string;
  readonly weight: string;
}

export interface ComputedStyles {
  readonly body: ComputedTypeStyle & { readonly backgroundColor: string };
  readonly h1: ComputedTypeStyle;
  readonly h2: ComputedTypeStyle;
  readonly h3: ComputedTypeStyle;
  /** Computed background-color of the largest above-the-fold element. */
  readonly primaryBackgroundColor: string;
}

export interface ComputedBackgroundAsset {
  /** Absolute URL resolved against the page origin by the driver. */
  readonly url: string;
  /** Selector or selector-with-index the URL was read from (for debug). */
  readonly selector: string;
}

/**
 * REQ-49 — a font asset URL discovered at render time. Picked up via either
 * `document.fonts` (resolved CSS Font Loading API entries) or by walking
 * inline `@font-face` rules in `document.styleSheets`. The driver resolves
 * the URL against the page's final URL before returning.
 */
export interface ComputedFontAsset {
  readonly url: string;
  /** Font family the URL belongs to (may be empty if unknown). */
  readonly family: string;
}

/**
 * REQ-49 — bounding box for a key page region. Coordinates are viewport
 * (CSS) pixels for the desktop viewport — the driver does not capture per-
 * viewport boxes (the desktop layout is the reference). Width/height of 0
 * means the element was offscreen or had no layout box; the driver omits
 * such entries.
 */
export interface ComputedBoundingBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ComputedBoundingBoxes {
  readonly hero?: ComputedBoundingBox;
  readonly nav?: ComputedBoundingBox;
  readonly sections: readonly ComputedBoundingBox[];
  readonly cards: readonly ComputedBoundingBox[];
}

export interface DriverResult {
  /** Hydrated HTML captured from the desktop viewport after networkidle0. */
  readonly html: string;
  readonly computedStyles: ComputedStyles;
  readonly computedBackgroundAssets: readonly ComputedBackgroundAsset[];
  /** REQ-49 — `@font-face` and document.fonts URLs discovered at render time. */
  readonly computedFontAssets: readonly ComputedFontAsset[];
  /** REQ-49 — bounding boxes for hero/nav/sections/cards on the desktop viewport. */
  readonly boundingBoxes: ComputedBoundingBoxes;
  /** PNG bytes per viewport, keyed by viewport name. Missing entries mean
   *  the viewport was unreachable (timeout) or out of budget. */
  readonly screenshots: Partial<Record<ViewportName, Uint8Array>>;
  /** Wall-clock seconds consumed across all viewports — charged to budget. */
  readonly durationSeconds: number;
}

export interface BrowserDriver {
  renderForViewports(
    url: string,
    viewports: readonly Viewport[],
  ): Promise<DriverResult>;
}

export interface RenderedFetchOptions {
  readonly driver: BrowserDriver;
  readonly url: string;
  readonly viewports?: readonly Viewport[];
}

/**
 * Run the rendered-fetch path against the supplied driver. Thin wrapper that
 * passes the default viewport set unless an override is provided. The driver
 * is responsible for puppeteer.launch + networkidle0 wait + screenshot loop.
 */
export async function renderedFetch(
  opts: RenderedFetchOptions,
): Promise<DriverResult> {
  const viewports = opts.viewports ?? DEFAULT_VIEWPORTS;
  return opts.driver.renderForViewports(opts.url, viewports);
}

/**
 * In-page script. Drivers call `page.evaluate(COMPUTED_EXTRACTION_SCRIPT)` to
 * run this in the browser context after the page has settled. Returns a
 * structured object the driver maps onto `ComputedStyles` +
 * `ComputedBackgroundAsset[]`.
 *
 * Kept as a string so drivers don't need to bundle the function — puppeteer
 * accepts string scripts via `page.evaluate`. The output URLs are still
 * relative; the driver resolves them against the page's final URL.
 */
export const COMPUTED_EXTRACTION_SCRIPT = `
(() => {
  function readType(el) {
    if (!el) return { family: "", size: "", weight: "", backgroundColor: "", backgroundImage: "" };
    var cs = getComputedStyle(el);
    return {
      family: cs.fontFamily || "",
      size: cs.fontSize || "",
      weight: cs.fontWeight || "",
      backgroundColor: cs.backgroundColor || "",
      backgroundImage: cs.backgroundImage || "",
    };
  }

  var body = readType(document.body);
  var h1 = readType(document.querySelector("h1"));
  var h2 = readType(document.querySelector("h2"));
  var h3 = readType(document.querySelector("h3"));

  var primaryBackgroundColor = "";
  var largestArea = 0;
  var atfElements = document.querySelectorAll("body *");
  for (var i = 0; i < atfElements.length; i++) {
    var el = atfElements[i];
    if (!el.getBoundingClientRect) continue;
    var r = el.getBoundingClientRect();
    if (r.top > window.innerHeight) continue;
    var visW = Math.max(0, Math.min(r.right, window.innerWidth) - Math.max(r.left, 0));
    var visH = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
    var area = visW * visH;
    if (area <= largestArea) continue;
    var cs = getComputedStyle(el);
    if (!cs.backgroundColor || cs.backgroundColor === "rgba(0, 0, 0, 0)" || cs.backgroundColor === "transparent") continue;
    largestArea = area;
    primaryBackgroundColor = cs.backgroundColor;
  }

  var bgSelectors = ["body", "header", "section"];
  var heroSelectors = [".hero", "[data-hero]", "main > section:first-child", ".banner", "[class*='hero']"];
  var seen = {};
  var allSelectors = [];
  for (var k = 0; k < bgSelectors.length; k++) {
    if (!seen[bgSelectors[k]]) { allSelectors.push(bgSelectors[k]); seen[bgSelectors[k]] = true; }
  }
  for (var k2 = 0; k2 < heroSelectors.length; k2++) {
    if (!seen[heroSelectors[k2]]) { allSelectors.push(heroSelectors[k2]); seen[heroSelectors[k2]] = true; }
  }

  var urlRe = /url\\(["']?([^"')]+)["']?\\)/g;
  var bgAssets = [];
  for (var s = 0; s < allSelectors.length; s++) {
    var sel = allSelectors[s];
    var els;
    try { els = document.querySelectorAll(sel); } catch (_) { continue; }
    for (var n = 0; n < els.length; n++) {
      var elN = els[n];
      var csN = getComputedStyle(elN);
      var bgi = csN.backgroundImage;
      if (!bgi || bgi === "none") continue;
      var match;
      urlRe.lastIndex = 0;
      while ((match = urlRe.exec(bgi)) !== null) {
        bgAssets.push({ url: match[1], selector: els.length > 1 ? sel + "[" + n + "]" : sel });
      }
    }
  }

  // ── REQ-49: @font-face URL capture ─────────────────────────────────────
  // Two sources: document.styleSheets (walk CSSFontFaceRule entries for src
  // url()) and document.fonts (the resolved CSS Font Loading API — picks up
  // dynamically loaded faces the static parse can't see). Cross-origin
  // stylesheets throw on cssRules access; we silently skip those (the URLs
  // are still reachable via Layer 3 if it ever lands).
  var fontAssets = [];
  var fontSeen = {};
  function pushFont(url, family) {
    if (!url) return;
    if (url.indexOf("data:") === 0) return;
    var key = url + "|" + family;
    if (fontSeen[key]) return;
    fontSeen[key] = true;
    fontAssets.push({ url: url, family: family || "" });
  }
  function familyOf(rule) {
    try {
      var ff = rule.style && rule.style.getPropertyValue("font-family");
      return ff ? ff.replace(/^["']|["']$/g, "").replace(/^\\s+|\\s+$/g, "") : "";
    } catch (_) { return ""; }
  }
  try {
    var sheets = document.styleSheets;
    for (var sh = 0; sh < sheets.length; sh++) {
      var rules;
      try { rules = sheets[sh].cssRules; } catch (_) { continue; }
      if (!rules) continue;
      for (var r2 = 0; r2 < rules.length; r2++) {
        var rule = rules[r2];
        if (!rule || rule.type !== 5 /* CSSFontFaceRule */) continue;
        var src = rule.style && rule.style.getPropertyValue("src");
        if (!src) continue;
        var fam = familyOf(rule);
        var fm;
        urlRe.lastIndex = 0;
        while ((fm = urlRe.exec(src)) !== null) {
          pushFont(fm[1], fam);
        }
      }
    }
  } catch (_) { /* document.styleSheets not available */ }
  try {
    if (document.fonts && typeof document.fonts.forEach === "function") {
      document.fonts.forEach(function (ff) {
        // FontFace.family / FontFace.src — src may be empty for system fonts.
        var fam = (ff.family || "").replace(/^["']|["']$/g, "");
        var ffSrc = ff.src || "";
        if (!ffSrc) return;
        var fm2;
        urlRe.lastIndex = 0;
        while ((fm2 = urlRe.exec(ffSrc)) !== null) {
          pushFont(fm2[1], fam);
        }
      });
    }
  } catch (_) { /* document.fonts not supported */ }

  // ── REQ-49: bounding boxes for hero/nav/sections/cards ─────────────────
  function boxOf(el) {
    if (!el || !el.getBoundingClientRect) return null;
    var r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return null;
    return {
      x: Math.round(r.left + (window.scrollX || 0)),
      y: Math.round(r.top + (window.scrollY || 0)),
      width: Math.round(r.width),
      height: Math.round(r.height),
    };
  }
  function firstBox(selectors) {
    for (var i = 0; i < selectors.length; i++) {
      var el;
      try { el = document.querySelector(selectors[i]); } catch (_) { continue; }
      var box = boxOf(el);
      if (box) return box;
    }
    return null;
  }
  function allBoxes(selector, limit) {
    var out = [];
    var els;
    try { els = document.querySelectorAll(selector); } catch (_) { return out; }
    for (var i = 0; i < els.length && out.length < limit; i++) {
      var box = boxOf(els[i]);
      if (box) out.push(box);
    }
    return out;
  }
  var heroBox = firstBox([".hero", "[data-hero]", "main > section:first-child", ".banner", "[class*='hero']"]);
  var navBox = firstBox(["nav", "header nav", "[role='navigation']", "header"]);
  var sectionBoxes = allBoxes("section", 12);
  var cardBoxes = allBoxes(".card, [class*='card'], article.card", 12);

  return {
    body: body,
    h1: h1,
    h2: h2,
    h3: h3,
    primaryBackgroundColor: primaryBackgroundColor,
    bgAssets: bgAssets,
    fontAssets: fontAssets,
    boundingBoxes: {
      hero: heroBox,
      nav: navBox,
      sections: sectionBoxes,
      cards: cardBoxes,
    },
  };
})();
`;
