import { describe, expect, it } from "vitest";
import { NOT_DETECTED, type ReferenceDigest } from "../packages/extractor/src/schema.js";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

const pngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x60, 0x00, 0x00, 0x00,
  0x02, 0x00, 0x01, 0xe5, 0x27, 0xde, 0xfc, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

describe("UAT FC REQ-30: digest.assetInventory references R2 keys (AC8)", () => {
  it("each assetInventory entry has a non-empty r2Key matching sites/{siteId}/imports/{sha}.{ext}", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-assets" });
    h.setAssetResponses({
      "https://assets.test/hero.png": {
        status: 200,
        contentType: "image/png",
        body: pngBytes,
      },
      "https://assets.test/decor.png": {
        status: 200,
        contentType: "image/png",
        body: pngBytes,
      },
    });
    await h.seedDigest("https://acme.test/", {
      signals: {
        palette: { background: "#ffffff", body: "#222222", accent: NOT_DETECTED, cta: NOT_DETECTED, supporting: [] },
        typography: {
          body: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          h1: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          h2: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          h3: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          primaryPair: NOT_DETECTED,
        },
        layout: { maxContentWidth: NOT_DETECTED, bias: NOT_DETECTED, density: NOT_DETECTED },
        imagery: { imgCount: 2, backgroundCount: 0, videoCount: 0, heroDetected: true },
        content: { headings: [{ level: 1, text: "Acme" }], navLinks: [], formFields: [], listGroupCount: 0, sectionCount: 1 },
        assetInventory: [
          { url: "https://assets.test/hero.png", kind: "img", classification: "hero", references: 1, alt: "Hero" },
          { url: "https://assets.test/decor.png", kind: "img", classification: "decorative", references: 1 },
        ],
      },
    } as Partial<ReferenceDigest>);
    await h.invokeConfirm({ url: "https://acme.test/" });
    await h.invokeTranscribe({ digestId: "https://acme.test/" });

    const obj = await h.env.ASSETS_BUCKET.get(
      "sites/acct-assets/transcription/digest.json",
    );
    const digest = JSON.parse(await obj!.text()) as Record<string, unknown>;
    const inv = digest.assetInventory as Array<Record<string, unknown>>;
    expect(inv.length).toBe(2);
    const keyPattern = /^sites\/acct-assets\/imports\/[0-9a-f]+\.(png|jpg|jpeg|gif|webp|svg|mp4|woff2?)$/i;
    for (const entry of inv) {
      expect(typeof entry.r2Key).toBe("string");
      expect((entry.r2Key as string).length).toBeGreaterThan(0);
      expect((entry.r2Key as string)).toMatch(keyPattern);
      expect(typeof entry.sourceUrl).toBe("string");
      expect(["img", "background", "video"]).toContain(entry.kind as string);
    }
  });

  it("mirror failures appear in mirrorSummary.failures, not in assetInventory", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-failures" });
    h.setAssetResponses({
      "https://assets.test/good.png": {
        status: 200,
        contentType: "image/png",
        body: pngBytes,
      },
    });
    h.setAssetFailures({
      "https://assets.test/bad.png": { reason: "fetch_failed" },
    });
    await h.seedDigest("https://acme.test/", {
      signals: {
        palette: { background: "#ffffff", body: "#222222", accent: NOT_DETECTED, cta: NOT_DETECTED, supporting: [] },
        typography: {
          body: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          h1: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          h2: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          h3: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          primaryPair: NOT_DETECTED,
        },
        layout: { maxContentWidth: NOT_DETECTED, bias: NOT_DETECTED, density: NOT_DETECTED },
        imagery: { imgCount: 2, backgroundCount: 0, videoCount: 0, heroDetected: false },
        content: { headings: [{ level: 1, text: "Acme" }], navLinks: [], formFields: [], listGroupCount: 0, sectionCount: 1 },
        assetInventory: [
          { url: "https://assets.test/good.png", kind: "img", classification: "decorative", references: 1 },
          { url: "https://assets.test/bad.png", kind: "img", classification: "decorative", references: 1 },
        ],
      },
    } as Partial<ReferenceDigest>);
    await h.invokeConfirm({ url: "https://acme.test/" });
    await h.invokeTranscribe({ digestId: "https://acme.test/" });

    const obj = await h.env.ASSETS_BUCKET.get(
      "sites/acct-failures/transcription/digest.json",
    );
    const digest = JSON.parse(await obj!.text()) as Record<string, unknown>;
    const inv = digest.assetInventory as Array<Record<string, unknown>>;
    expect(inv.length).toBe(1);
    expect((inv[0].sourceUrl as string)).toBe("https://assets.test/good.png");

    const mirror = digest.mirrorSummary as Record<string, unknown>;
    expect(mirror.mirrored).toBe(1);
    expect(mirror.failed).toBe(1);
    const failures = mirror.failures as Array<Record<string, unknown>>;
    expect(failures).toHaveLength(1);
    expect(failures[0].url).toBe("https://assets.test/bad.png");
  });
});
