import { describe, expect, it } from "vitest";
import {
  renderedFetch,
  type BrowserDriver,
  type ComputedStyles,
  type DriverResult,
  type Viewport,
  type ViewportName,
} from "../packages/extractor/src/index.js";

/**
 * AC-612: Running the rendered fetch path against a JS-SPA reference (through
 * the injectable browser driver) returns the hydrated HTML — well over 1000
 * visible characters where the static shell had almost none — together with
 * computed styles for body and headings, computed background assets, and
 * per-viewport PNG screenshot bytes. In tests the driver is injected and
 * deterministic, so no real browser is launched.
 */

/** Approximate visible-text length: strip script/style/markup, collapse space. */
function visibleLength(html: string): number {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}

// Hydrated HTML the fake driver returns for the js-spa reference: the static
// shell was an empty <div id="root">; after hydration the body carries a hero,
// features, CTA, and >1000 chars of visible copy.
const HYDRATED_HTML = `<!doctype html><html><head><title>Acme</title></head>
<body>
  <header><nav><a href="/">Acme</a><a href="/about">About</a></nav></header>
  <main>
    <section class="hero"><h1>Build with Acme</h1>
    <p>${"Hydrated SPA copy. ".repeat(80)}</p>
    <button class="cta">Get started</button></section>
    <section class="features"><h2>Features</h2><h3>Fast</h3></section>
  </main>
</body></html>`;

const COMPUTED: ComputedStyles = {
  body: {
    family: "Inter, system-ui, sans-serif",
    size: "16px",
    weight: "400",
    backgroundColor: "rgb(255, 255, 255)",
  },
  h1: { family: "Inter, system-ui, sans-serif", size: "48px", weight: "700" },
  h2: { family: "Inter, system-ui, sans-serif", size: "32px", weight: "700" },
  h3: { family: "Inter, system-ui, sans-serif", size: "24px", weight: "600" },
  primaryBackgroundColor: "rgb(255, 255, 255)",
};

const TINY_PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

function fakeDriver(): BrowserDriver & { calls: number } {
  const driver = {
    calls: 0,
    async renderForViewports(
      _url: string,
      viewports: readonly Viewport[],
    ): Promise<DriverResult> {
      driver.calls += 1;
      const screenshots: Partial<Record<ViewportName, Uint8Array>> = {};
      for (const vp of viewports) screenshots[vp.name] = TINY_PNG;
      return {
        html: HYDRATED_HTML,
        computedStyles: COMPUTED,
        computedBackgroundAssets: [{ url: "/hero-bg.jpg", selector: ".hero" }],
        screenshots,
        durationSeconds: 4,
      };
    },
  };
  return driver;
}

describe("UAT AC-612: rendered fetch path returns hydrated HTML and computed styles via the injected driver", () => {
  it("test_UAT_AC612_rendered_fetch_returns_hydrated_html", async () => {
    const driver = fakeDriver();
    const result = await renderedFetch({ driver, url: "https://spa.test/" });

    // Deterministic injected driver — exercised, not a real browser.
    expect(driver.calls).toBe(1);

    // Hydrated HTML carries well over 1000 visible characters (the static shell
    // had almost none).
    expect(visibleLength(result.html)).toBeGreaterThan(1000);

    // Computed styles for body and h1 are present and populated.
    expect(result.computedStyles.body.family).toBe("Inter, system-ui, sans-serif");
    expect(result.computedStyles.h1.family).toBe("Inter, system-ui, sans-serif");
    expect(result.computedStyles.body.backgroundColor).toBe("rgb(255, 255, 255)");

    // Computed background assets and per-viewport screenshots are returned.
    expect(result.computedBackgroundAssets.length).toBeGreaterThan(0);
    expect(result.screenshots.mobile).toBeDefined();
    expect(result.screenshots.tablet).toBeDefined();
    expect(result.screenshots.desktop).toBeDefined();
  });
});
