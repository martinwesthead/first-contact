import { describe, expect, it } from "vitest";
import {
  ReferenceDigest,
  SCHEMA_VERSION,
  NOT_DETECTED,
  type ReferenceDigest as ReferenceDigestType,
} from "../packages/extractor/src/index.js";

function makeValidDigest(): ReferenceDigestType {
  return {
    schemaVersion: SCHEMA_VERSION,
    sourceUrl: "https://example.com/",
    fetchedAt: "2026-06-18T00:00:00.000Z",
    fetchPath: "static",
    summary: "A tiny static landing page.",
    signals: {
      palette: {
        background: "#ffffff",
        body: "#222222",
        accent: "#16a34a",
        cta: "#2563eb",
        supporting: ["#f3f4f6"],
      },
      typography: {
        body: { family: "Inter", size: "16px", weight: "400" },
        h1: { family: "Poppins", size: "48px", weight: "700" },
        h2: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
        h3: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
        primaryPair: { heading: "Poppins", body: "Inter" },
      },
      layout: { maxContentWidth: 1200, bias: "centered", density: "balanced" },
      imagery: { imgCount: 1, backgroundCount: 1, videoCount: 1, heroDetected: true },
      content: {
        headings: [{ level: 1, text: "Hello" }],
        navLinks: [{ text: "Home", href: "/" }],
        formFields: [],
        listGroupCount: 1,
        sectionCount: 2,
      },
      assetInventory: [
        {
          url: "https://x.test/hero.jpg",
          kind: "img",
          classification: "hero",
          references: 1,
        },
      ],
    },
    commentary: { perSection: {}, whatsMissing: [] },
    screenshotKeys: {},
  };
}

describe("UAT AC-594: Reference Digest conforms to a versioned schema enforced by a validator", () => {
  it("test_UAT_AC594_reference_digest_schema_validator", () => {
    // A well-formed digest passes.
    expect(ReferenceDigest.safeParse(makeValidDigest()).success).toBe(true);

    // (a) Wrong schemaVersion is rejected.
    const wrongVersion = makeValidDigest() as unknown as Record<string, unknown>;
    wrongVersion.schemaVersion = 2;
    expect(ReferenceDigest.safeParse(wrongVersion).success).toBe(false);

    // (b) Dropping a required signal category is rejected.
    const missingCategory = makeValidDigest();
    delete (missingCategory.signals as { palette?: unknown }).palette;
    expect(ReferenceDigest.safeParse(missingCategory).success).toBe(false);

    // (c) An asset record with an out-of-range kind is rejected.
    const badAssetKind = makeValidDigest();
    (badAssetKind.signals.assetInventory[0] as { kind: string }).kind = "banner";
    expect(ReferenceDigest.safeParse(badAssetKind).success).toBe(false);
  });
});
