import { describe, expect, it } from "vitest";
import {
  NOT_DETECTED,
  type ReferenceDigest,
} from "../packages/extractor/src/schema.js";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

const pngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x60, 0x00, 0x00, 0x00,
  0x02, 0x00, 0x01, 0xe5, 0x27, 0xde, 0xfc, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

function minimalSignals(
  title: string,
  navLinks: ReferenceDigest["signals"]["content"]["navLinks"],
  assetInventory: ReferenceDigest["signals"]["assetInventory"],
): Partial<ReferenceDigest> {
  return {
    signals: {
      palette: {
        background: "#ffffff",
        body: "#1f2937",
        accent: "#16a34a",
        cta: "#7c3aed",
        supporting: [],
      },
      typography: {
        body: { family: "Inter", size: NOT_DETECTED, weight: NOT_DETECTED },
        h1: { family: "Inter", size: NOT_DETECTED, weight: NOT_DETECTED },
        h2: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
        h3: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
        primaryPair: { body: "Inter", heading: "Inter" },
      },
      layout: { maxContentWidth: 1024, bias: "centered", density: "balanced" },
      imagery: { imgCount: 1, backgroundCount: 0, videoCount: 0, heroDetected: true },
      content: {
        headings: [{ level: 1, text: title }],
        navLinks,
        formFields: [],
        listGroupCount: 0,
        sectionCount: 1,
      },
      assetInventory,
    },
  };
}

/**
 * AC-630: A successful conversion persists a TranscriptionDigest artifact at the
 * per-site location with theme tokens, a per-page plan, and an asset inventory;
 * the completion summary's pageCount and assetCount equal the lengths of the
 * persisted per-page plan and asset inventory.
 */
describe("UAT AC-630: successful conversion persists a per-site digest matching the summary counts", () => {
  it("test_UAT_AC630_persists_per_site_digest_matching_summary_counts", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-630" });
    h.setAssetResponses({
      "https://acme.test/hero.png": {
        status: 200,
        contentType: "image/png",
        body: pngBytes,
      },
    });
    await h.seedDigest(
      "https://acme.test/",
      minimalSignals(
        "Acme",
        [{ text: "Menu", href: "https://acme.test/menu" }],
        [
          {
            url: "https://acme.test/hero.png",
            kind: "img",
            classification: "hero",
            references: 1,
            alt: "Hero",
          },
        ],
      ),
    );
    await h.seedDigest(
      "https://acme.test/menu",
      minimalSignals("Menu", [], []),
    );

    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("ok");
    const summary = ((result as { payload?: Record<string, unknown> }).payload ?? {})
      .summary as { pageCount: number; assetCount: number };

    // Artifact persisted at the stable per-site location and parses.
    const obj = await h.env.ASSETS_BUCKET.get(
      "sites/acct-630/transcription/digest.json",
    );
    expect(obj).not.toBeNull();
    const digest = JSON.parse(await obj!.text()) as {
      themeTokens: unknown;
      perPagePlan: unknown[];
      assetInventory: unknown[];
    };

    expect(digest.themeTokens).toBeDefined();
    expect(Array.isArray(digest.perPagePlan)).toBe(true);
    expect(Array.isArray(digest.assetInventory)).toBe(true);

    // Counts reported in the summary equal the persisted artifact's lengths.
    expect(summary.pageCount).toBe(digest.perPagePlan.length);
    expect(summary.assetCount).toBe(digest.assetInventory.length);

    // Multi-page + asset present, so the equality is non-trivial.
    expect(digest.perPagePlan.length).toBeGreaterThanOrEqual(2);
    expect(digest.assetInventory.length).toBeGreaterThanOrEqual(1);
  });
});
