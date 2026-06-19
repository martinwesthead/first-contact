import { describe, expect, it } from "vitest";
import {
  NOT_DETECTED,
  renderDigestMarkdown,
  SCHEMA_VERSION,
  type ReferenceDigest,
} from "../packages/extractor/src/index.js";

const baseDigest = (): ReferenceDigest => ({
  schemaVersion: SCHEMA_VERSION,
  sourceUrl: "https://example.com/",
  fetchedAt: "2026-06-18T00:00:00.000Z",
  fetchPath: "static",
  summary: "Example: a tiny static landing page.",
  signals: {
    palette: {
      background: "#fff",
      body: "#222",
      accent: "#16a34a",
      cta: "#2563eb",
      supporting: ["#f3f4f6"],
    },
    typography: {
      body: { family: "Inter", size: "16px", weight: "400" },
      h1: { family: "Inter", size: "48px", weight: "700" },
      h2: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
      h3: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
      primaryPair: { heading: "Inter", body: "Inter" },
    },
    layout: { maxContentWidth: 1100, bias: "centered", density: "balanced" },
    imagery: { imgCount: 2, backgroundCount: 1, videoCount: 1, heroDetected: true },
    content: {
      headings: [
        { level: 1, text: "Hello" },
        { level: 2, text: "World" },
      ],
      navLinks: [{ text: "Home", href: "/" }],
      formFields: [],
      listGroupCount: 1,
      sectionCount: 3,
    },
    assetInventory: [
      {
        url: "https://x.test/hero.jpg",
        kind: "img",
        classification: "hero",
        width: 1200,
        height: 600,
        references: 1,
      },
      {
        url: "https://x.test/bg.png",
        kind: "background",
        classification: "unknown",
        references: 1,
      },
      {
        url: "https://x.test/intro.mp4",
        kind: "video",
        classification: "unknown",
        references: 1,
      },
    ],
  },
  commentary: {
    perSection: { palette: "Bright, high-contrast." },
    whatsMissing: [],
  },
  screenshotKeys: {},
});

describe("UAT FC REQ-21: digest markdown shape (AC 8)", () => {
  it("AC8: renders exactly one H1 (title) and one ## section per signal category", () => {
    const md = renderDigestMarkdown(baseDigest());
    const h1Matches = md.match(/^# /gm) ?? [];
    expect(h1Matches.length).toBe(1);
    expect(md).toMatch(/^# Reference Digest — https:\/\/example\.com\//);

    for (const section of [
      "1. Palette",
      "2. Typography",
      "3. Layout",
      "4. Imagery",
      "5. Content",
      "6. Asset Inventory",
    ]) {
      expect(md).toContain(`## ${section}`);
    }
  });

  it("AC8: the asset-inventory section enumerates img / background / video counts and lists each asset under its kind", () => {
    const md = renderDigestMarkdown(baseDigest());
    expect(md).toContain("### Images (1)");
    expect(md).toContain("### Backgrounds (1)");
    expect(md).toContain("### Videos (1)");
    expect(md).toContain("https://x.test/hero.jpg");
    expect(md).toContain("https://x.test/bg.png");
    expect(md).toContain("https://x.test/intro.mp4");
  });

  it("AC8: the summary block is rendered as a blockquote immediately after the title, and a `## Table of contents` appears before the numbered sections", () => {
    const md = renderDigestMarkdown(baseDigest());
    expect(md).toContain("> Example: a tiny static landing page.");
    expect(md).toMatch(/## Table of contents[\s\S]+## 1\. Palette/);
  });

  it("AC8: whatsMissing is rendered under a `## What's missing` section; empty list shows a parenthetical placeholder", () => {
    const md = renderDigestMarkdown(baseDigest());
    expect(md).toContain("## What's missing");
    expect(md).toContain("(nothing — every signal category produced data)");
  });
});
