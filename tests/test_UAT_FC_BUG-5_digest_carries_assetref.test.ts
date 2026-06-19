import { describe, expect, it } from "vitest";
import {
  buildTranscriptionDigest,
  NOT_DETECTED,
  SCHEMA_VERSION,
  type ReferenceDigest,
} from "../packages/extractor/src/index.js";
import { AssetRef } from "@1stcontact/site-schema";

function fixtureDigest(
  url: string,
  inventory: ReferenceDigest["signals"]["assetInventory"],
): ReferenceDigest {
  return {
    schemaVersion: SCHEMA_VERSION,
    sourceUrl: url,
    fetchedAt: "2026-06-19T00:00:00.000Z",
    fetchPath: "rendered",
    summary: "fixture",
    signals: {
      palette: {
        background: "#ffffff",
        body: "#111111",
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
      layout: {
        maxContentWidth: NOT_DETECTED,
        bias: NOT_DETECTED,
        density: NOT_DETECTED,
      },
      imagery: {
        imgCount: inventory.length,
        backgroundCount: 0,
        videoCount: 0,
        heroDetected: inventory.length > 0,
      },
      content: {
        headings: [{ level: 1, text: "Fixture" }],
        navLinks: [],
        formFields: [],
        listGroupCount: 0,
        sectionCount: 1,
      },
      assetInventory: inventory,
    },
    commentary: { perSection: {}, whatsMissing: [] },
    screenshotKeys: {},
  };
}

/**
 * BUG-5: every mirrored asset in the transcription digest must carry a
 * precomputed `assetRef` that the AI can pass verbatim to set_module_content.
 * Without this, the AI has to assemble {id,src,alt} itself — which it did
 * wrong (string instead of object) and broke image rendering end-to-end.
 */
describe("UAT FC BUG-5: buildTranscriptionDigest precomputes a valid AssetRef per inventory entry", () => {
  it("each assetInventory entry carries an assetRef object that validates against the AssetRef schema", () => {
    const home = fixtureDigest("https://acme.test/", [
      { url: "https://acme.test/hero.png", kind: "img", classification: "hero", references: 1, alt: "Hero shot" },
      { url: "https://acme.test/decor.png", kind: "img", classification: "decorative", references: 1 },
    ]);
    const urlToR2Key = new Map<string, string>([
      ["https://acme.test/hero.png", "sites/acct-x/imports/aaaaaaaa.png"],
      ["https://acme.test/decor.png", "sites/acct-x/imports/bbbbbbbb.png"],
    ]);
    const digest = buildTranscriptionDigest({
      siteId: "acct-x",
      homeDigest: home,
      additionalPageDigests: [],
      urlToR2Key,
      mirrorSummary: { mirrored: 2, failed: 0, failures: [] },
      capturedAt: "2026-06-19T00:00:00.000Z",
    });

    expect(digest.assetInventory).toHaveLength(2);
    for (const entry of digest.assetInventory) {
      expect(entry.assetRef).toBeDefined();
      // Validate against the canonical AssetRef Zod schema. Catches any future
      // drift in either the AssetRef shape or buildTranscriptionDigest's composer.
      const parsed = AssetRef.safeParse(entry.assetRef);
      expect(parsed.success).toBe(true);
      // The src must point at the /assets/<r2Key> route the worker serves.
      expect(entry.assetRef.src).toBe(`/assets/${entry.r2Key}`);
      // The id must equal r2Key so the AI can recover it later.
      expect(entry.assetRef.id).toBe(entry.r2Key);
    }
  });

  it("uses the asset's alt text when present, otherwise an empty string", () => {
    const home = fixtureDigest("https://acme.test/", [
      { url: "https://acme.test/with-alt.png", kind: "img", classification: "hero", references: 1, alt: "Hero" },
      { url: "https://acme.test/no-alt.png", kind: "img", classification: "decorative", references: 1 },
    ]);
    const digest = buildTranscriptionDigest({
      siteId: "acct-x",
      homeDigest: home,
      additionalPageDigests: [],
      urlToR2Key: new Map([
        ["https://acme.test/with-alt.png", "sites/acct-x/imports/aaaaaaaa.png"],
        ["https://acme.test/no-alt.png", "sites/acct-x/imports/bbbbbbbb.png"],
      ]),
      mirrorSummary: { mirrored: 2, failed: 0, failures: [] },
      capturedAt: "2026-06-19T00:00:00.000Z",
    });

    const withAlt = digest.assetInventory.find((e) => e.sourceUrl.endsWith("with-alt.png"))!;
    const noAlt = digest.assetInventory.find((e) => e.sourceUrl.endsWith("no-alt.png"))!;
    expect(withAlt.assetRef.alt).toBe("Hero");
    // Empty string — schema requires `alt` to be present as a string, even if blank.
    expect(noAlt.assetRef.alt).toBe("");
  });
});
