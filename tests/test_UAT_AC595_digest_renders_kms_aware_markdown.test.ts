import { describe, expect, it } from "vitest";
import {
  renderDigestMarkdown,
  SCHEMA_VERSION,
  NOT_DETECTED,
  type ReferenceDigest,
} from "../packages/extractor/src/index.js";

function fullDigest(): ReferenceDigest {
  return {
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
      imagery: { imgCount: 1, backgroundCount: 1, videoCount: 1, heroDetected: true },
      content: {
        headings: [{ level: 1, text: "Hello" }],
        navLinks: [{ text: "Home", href: "/" }],
        formFields: [],
        listGroupCount: 1,
        sectionCount: 3,
      },
      assetInventory: [
        { url: "https://x.test/hero.jpg", kind: "img", classification: "hero", references: 1 },
        { url: "https://x.test/bg.png", kind: "background", classification: "unknown", references: 1 },
        { url: "https://x.test/intro.mp4", kind: "video", classification: "unknown", references: 1 },
      ],
    },
    commentary: {
      perSection: {},
      whatsMissing: ["Layout: alignment bias not detected."],
    },
    screenshotKeys: {},
  };
}

function sparseDigest(): ReferenceDigest {
  return {
    schemaVersion: SCHEMA_VERSION,
    sourceUrl: "https://sparse.test/",
    fetchedAt: "2026-06-18T00:00:00.000Z",
    fetchPath: "static",
    summary: "",
    signals: {
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
      layout: { maxContentWidth: NOT_DETECTED, bias: NOT_DETECTED, density: NOT_DETECTED },
      imagery: { imgCount: 0, backgroundCount: 0, videoCount: 0, heroDetected: false },
      content: { headings: [], navLinks: [], formFields: [], listGroupCount: 0, sectionCount: 0 },
      assetInventory: [],
    },
    commentary: { perSection: {}, whatsMissing: [] },
    screenshotKeys: {},
  };
}

describe("UAT AC-595: digest renders as KMS-aware markdown with title, ToC, per-category sections, and asset inventory", () => {
  it("test_UAT_AC595_digest_renders_kms_aware_markdown", () => {
    const md = renderDigestMarkdown(fullDigest());

    // Exactly one H1, naming the source URL.
    const h1Matches = md.match(/^# /gm) ?? [];
    expect(h1Matches.length).toBe(1);
    expect(md).toMatch(/^# Reference Digest — https:\/\/example\.com\//);

    // Blockquote summary line + a Table of contents before the numbered sections.
    expect(md).toContain("> Example: a tiny static landing page.");
    expect(md).toMatch(/## Table of contents[\s\S]+## 1\. Palette/);

    // A numbered section heading for each of the six categories.
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

    // Asset-inventory sub-heading per kind carrying its count.
    expect(md).toContain("### Images (1)");
    expect(md).toContain("### Backgrounds (1)");
    expect(md).toContain("### Videos (1)");

    // What's missing section reflects the whatsMissing entries.
    expect(md).toContain("## What's missing");
    expect(md).toContain("- Layout: alignment bias not detected.");

    // A sparse digest renders absent signals as not_detected text, not missing lines.
    const sparseMd = renderDigestMarkdown(sparseDigest());
    expect(sparseMd).toContain(`- Background: ${NOT_DETECTED}`);
    expect(sparseMd).toContain(`- Bias: ${NOT_DETECTED}`);
    expect(sparseMd).toContain(`- Primary pair: ${NOT_DETECTED}`);
  });
});
