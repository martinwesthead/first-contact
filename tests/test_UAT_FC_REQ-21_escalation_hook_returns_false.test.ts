import { describe, expect, it } from "vitest";
import {
  shouldEscalateToRendered,
  SCHEMA_VERSION,
  type ReferenceDigest,
} from "../packages/extractor/src/index.js";

describe("UAT FC REQ-21: shouldEscalateToRendered returns false (AC 11)", () => {
  it("AC11: in REQ-21 the escalation hook is always false; REQ-22 replaces the body", () => {
    const digest: ReferenceDigest = {
      schemaVersion: SCHEMA_VERSION,
      sourceUrl: "https://x.test/",
      fetchedAt: "2026-06-18T00:00:00.000Z",
      fetchPath: "static",
      summary: "",
      signals: {
        palette: {
          background: "not_detected",
          body: "not_detected",
          accent: "not_detected",
          cta: "not_detected",
          supporting: [],
        },
        typography: {
          body: { family: "not_detected", size: "not_detected", weight: "not_detected" },
          h1: { family: "not_detected", size: "not_detected", weight: "not_detected" },
          h2: { family: "not_detected", size: "not_detected", weight: "not_detected" },
          h3: { family: "not_detected", size: "not_detected", weight: "not_detected" },
          primaryPair: "not_detected",
        },
        layout: {
          maxContentWidth: "not_detected",
          bias: "not_detected",
          density: "not_detected",
        },
        imagery: { imgCount: 0, backgroundCount: 0, videoCount: 0, heroDetected: false },
        content: { headings: [], navLinks: [], formFields: [], listGroupCount: 0, sectionCount: 0 },
        assetInventory: [],
      },
      commentary: { perSection: {}, whatsMissing: [] },
      screenshotKeys: {},
    };
    expect(shouldEscalateToRendered(digest)).toBe(false);
  });
});
