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

describe("UAT FC REQ-37: transcribe_site summary surfaces per-URL asset failures", () => {
  it("payload.summary.assetFailures lists every failed mirror with its URL and reason", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-req37-failures" });
    h.setAssetResponses({
      "https://assets.test/ok.png": {
        status: 200,
        contentType: "image/png",
        body: pngBytes,
      },
    });
    h.setAssetFailures({
      "https://assets.test/missing.png": { reason: "non_2xx" },
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
          { url: "https://assets.test/ok.png", kind: "img", classification: "decorative", references: 1 },
          { url: "https://assets.test/missing.png", kind: "img", classification: "decorative", references: 1 },
        ],
      },
    } as Partial<ReferenceDigest>);

    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const payload = result.payload as Record<string, unknown>;
    const summary = payload.summary as Record<string, unknown>;

    expect(summary.mirrored).toBe(1);
    expect(summary.mirrorFailures).toBe(1);

    const assetFailures = summary.assetFailures as Array<Record<string, unknown>>;
    expect(Array.isArray(assetFailures)).toBe(true);
    expect(assetFailures).toHaveLength(1);
    expect(assetFailures[0].url).toBe("https://assets.test/missing.png");
    expect(typeof assetFailures[0].reason).toBe("string");
    expect((assetFailures[0].reason as string).length).toBeGreaterThan(0);
  });

  it("payload.summary.assetFailures is an empty array when every mirror succeeds", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-req37-all-ok" });
    h.setAssetResponses({
      "https://assets.test/a.png": { status: 200, contentType: "image/png", body: pngBytes },
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
        imagery: { imgCount: 1, backgroundCount: 0, videoCount: 0, heroDetected: false },
        content: { headings: [{ level: 1, text: "Acme" }], navLinks: [], formFields: [], listGroupCount: 0, sectionCount: 1 },
        assetInventory: [
          { url: "https://assets.test/a.png", kind: "img", classification: "decorative", references: 1 },
        ],
      },
    } as Partial<ReferenceDigest>);

    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const summary = (result.payload as Record<string, unknown>).summary as Record<string, unknown>;
    expect(summary.mirrorFailures).toBe(0);
    expect(summary.assetFailures).toEqual([]);
  });
});
