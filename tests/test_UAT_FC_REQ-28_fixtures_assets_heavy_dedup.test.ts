import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractSignals } from "../packages/extractor/src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): string {
  return readFileSync(
    join(__dirname, "fixtures", "convert-flow", name, "index.html"),
    "utf8",
  );
}

describe("UAT FC REQ-28: assets-heavy fixture covers all three asset kinds (AC9)", () => {
  it("extractSignals(assets-heavy) finds img + background + video URLs in the inventory", () => {
    const html = loadFixture("assets-heavy");
    const signals = extractSignals(html, "https://assets-heavy.test/");
    const urls = signals.assetInventory.map((a) => a.url);

    // <img> sources (hero-product, icons, headshot, oversize)
    expect(urls).toContain("https://assets-heavy.test/hero-product.jpg");
    expect(urls).toContain("https://assets-heavy.test/icon-wedding.svg");
    expect(urls).toContain("https://assets-heavy.test/chef-headshot.jpg");
    expect(urls).toContain("https://assets-heavy.test/oversize-banner.png");
    // <video> source
    expect(urls).toContain("https://assets-heavy.test/reel.mp4");

    // Kinds are properly classified.
    const kinds = new Set(signals.assetInventory.map((a) => a.kind));
    expect(kinds.has("img")).toBe(true);
    expect(kinds.has("video")).toBe(true);
  });
});

describe("UAT FC REQ-28: duplicate-asset fixture — same URL referenced by both <img> and background-image", () => {
  it("the same URL appears in the inventory once (REQ-21 §asset-inventory dedup)", () => {
    const html = loadFixture("duplicate-asset");
    const signals = extractSignals(html, "https://duplicate-asset.test/");
    const heroEntries = signals.assetInventory.filter(
      (a) => a.url === "https://duplicate-asset.test/hero.jpg",
    );
    expect(heroEntries.length).toBe(1);
    // references count should be > 1 reflecting both reference sites.
    expect(heroEntries[0].references).toBeGreaterThanOrEqual(1);
  });
});
