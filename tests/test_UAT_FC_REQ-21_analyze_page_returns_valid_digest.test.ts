import { describe, expect, it } from "vitest";
import {
  ReferenceDigest,
  SCHEMA_VERSION,
} from "../packages/extractor/src/index.js";
import { loadFixture, makeHarness } from "./_helpers_REQ-21_analyze_page.js";

describe("UAT FC REQ-21: analyze_page returns a valid Reference Digest (AC 1)", () => {
  it("AC1: returns schemaVersion=1, populated signals, and digestMarkdown matching the KMS-aware shape", async () => {
    const h = makeHarness();
    h.setHtmlBody(loadFixture("plain-html-site"));
    h.setAnthropicCommentary({
      summary: "A clean static landing page with a hero and contact form.",
      perSection: { palette: "Bright, calm." },
      whatsMissing: [],
    });

    const result = await h.invoke({ url: "https://x.test/" });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    const payload = result.payload as {
      kind: string;
      digest: unknown;
      digestMarkdown: string;
    };
    expect(payload.kind).toBe("reference_digest");

    const parsed = ReferenceDigest.safeParse(payload.digest);
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      throw new Error(JSON.stringify(parsed.error.format(), null, 2));
    }
    expect(parsed.data.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.data.signals.palette).toBeDefined();
    expect(parsed.data.signals.typography).toBeDefined();
    expect(parsed.data.signals.layout).toBeDefined();
    expect(parsed.data.signals.imagery).toBeDefined();
    expect(parsed.data.signals.content).toBeDefined();
    expect(Array.isArray(parsed.data.signals.assetInventory)).toBe(true);
    expect(parsed.data.fetchPath).toBe("static");

    // KMS-aware markdown shape
    expect(payload.digestMarkdown).toMatch(/^# Reference Digest — /);
    expect(payload.digestMarkdown).toContain("## Table of contents");
    expect(payload.digestMarkdown).toContain("## 1. Palette");
    expect(payload.digestMarkdown).toContain("## 6. Asset Inventory");
  });
});
