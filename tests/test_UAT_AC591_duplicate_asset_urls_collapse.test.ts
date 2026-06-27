import { describe, expect, it } from "vitest";
import { parseImagery } from "../packages/extractor/src/index.js";

describe("UAT AC-591: duplicate asset URLs collapse to one record with a references count and first-discovered kind", () => {
  it("test_UAT_AC591_duplicate_asset_urls_collapse", () => {
    // /hero.jpg appears as an <img> AND a <style>-block background-image.
    // /panel.png appears twice as <style>-block background-images.
    const html = `<!doctype html><html><head><style>
      .a { background-image: url(/hero.jpg); }
      .b { background-image: url(/panel.png); }
      .c { background-image: url(/panel.png); }
    </style></head><body>
      <img src="/hero.jpg" alt="Hero">
    </body></html>`;
    const { assetInventory } = parseImagery(html, "https://x.test/");

    const hero = assetInventory.filter((r) => r.url.endsWith("/hero.jpg"));
    const panel = assetInventory.filter((r) => r.url.endsWith("/panel.png"));

    // Each URL collapses to exactly one record.
    expect(hero).toHaveLength(1);
    expect(panel).toHaveLength(1);

    // hero: img wins (discovered first), references counts both appearances.
    expect(hero[0].kind).toBe("img");
    expect(hero[0].references).toBe(2);

    // panel: only ever a background, referenced twice.
    expect(panel[0].kind).toBe("background");
    expect(panel[0].references).toBe(2);
  });
});
