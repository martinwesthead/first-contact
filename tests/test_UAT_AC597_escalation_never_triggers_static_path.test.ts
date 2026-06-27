import { describe, expect, it } from "vitest";
import {
  shouldEscalateToRendered,
  SCHEMA_VERSION,
  NOT_DETECTED,
  type ReferenceDigest,
} from "../packages/extractor/src/index.js";

function digestWith(signals: ReferenceDigest["signals"]): ReferenceDigest {
  return {
    schemaVersion: SCHEMA_VERSION,
    sourceUrl: "https://x.test/",
    fetchedAt: "2026-06-18T00:00:00.000Z",
    fetchPath: "static",
    summary: "",
    signals,
    commentary: { perSection: {}, whatsMissing: [] },
    screenshotKeys: {},
  };
}

const emptySignals: ReferenceDigest["signals"] = {
  palette: { background: NOT_DETECTED, body: NOT_DETECTED, accent: NOT_DETECTED, cta: NOT_DETECTED, supporting: [] },
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
};

const sparseSignals: ReferenceDigest["signals"] = {
  ...emptySignals,
  palette: { background: "#fff", body: NOT_DETECTED, accent: NOT_DETECTED, cta: NOT_DETECTED, supporting: [] },
};

const fullSignals: ReferenceDigest["signals"] = {
  palette: { background: "#fff", body: "#222", accent: "#16a34a", cta: "#2563eb", supporting: ["#f3f4f6"] },
  typography: {
    body: { family: "Inter", size: "16px", weight: "400" },
    h1: { family: "Poppins", size: "48px", weight: "700" },
    h2: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
    h3: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
    primaryPair: { heading: "Poppins", body: "Inter" },
  },
  layout: { maxContentWidth: 1200, bias: "centered", density: "balanced" },
  imagery: { imgCount: 2, backgroundCount: 1, videoCount: 1, heroDetected: true },
  content: {
    headings: [{ level: 1, text: "Hello" }],
    navLinks: [{ text: "Home", href: "/" }],
    formFields: [],
    listGroupCount: 1,
    sectionCount: 2,
  },
  assetInventory: [
    { url: "https://x.test/hero.jpg", kind: "img", classification: "hero", references: 1 },
  ],
};

describe("UAT AC-597: every page is analyzed via the static path; rendered-path escalation never triggers", () => {
  it("test_UAT_AC597_escalation_never_triggers_static_path", () => {
    // Across fully-populated, sparse, and empty digests, escalation never selects
    // the rendered path in this version — analysis stays on the static path.
    expect(shouldEscalateToRendered(digestWith(fullSignals))).toBe(false);
    expect(shouldEscalateToRendered(digestWith(sparseSignals))).toBe(false);
    expect(shouldEscalateToRendered(digestWith(emptySignals))).toBe(false);
  });
});
