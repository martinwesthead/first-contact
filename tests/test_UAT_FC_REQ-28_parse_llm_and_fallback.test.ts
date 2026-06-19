import { describe, expect, it } from "vitest";
import {
  NOT_DETECTED,
  SCHEMA_VERSION,
  type ReferenceDigest,
} from "../packages/extractor/src/index.js";
import {
  buildHeroOnlyFallback,
  parseTranscriptionFromLlm,
  validateTranscription,
} from "../packages/extractor/src/transcribe.js";

function makeDigest(overrides: Partial<ReferenceDigest> = {}): ReferenceDigest {
  return {
    schemaVersion: SCHEMA_VERSION,
    sourceUrl: "https://example.com/",
    fetchedAt: "2026-06-18T00:00:00.000Z",
    fetchPath: "static",
    summary: "test",
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
      content: {
        headings: [{ level: 1, text: "Acme Co" }],
        navLinks: [],
        formFields: [],
        listGroupCount: 0,
        sectionCount: 0,
      },
      assetInventory: [],
    },
    commentary: { perSection: {}, whatsMissing: [] },
    screenshotKeys: {},
    ...overrides,
  };
}

const lowConfTokens = {
  palette: {},
  typography: { family: {} },
  confidence: { palette: "low" as const, typography: "low" as const, layout: "low" as const },
};

describe("UAT FC REQ-28: parseTranscriptionFromLlm (tolerant JSON extraction)", () => {
  it("parses JSON wrapped in prose", () => {
    const raw = `Here is your transcription:
    {
      "modules": [
        { "id": "h-1", "type": "hero", "version": 1, "variant": "bg-color", "content": { "heading": "x" }, "confidence": "high" }
      ],
      "narrative": "Done"
    }
    Let me know if you want changes.`;
    const t = parseTranscriptionFromLlm(raw, lowConfTokens);
    expect(t).not.toBeNull();
    expect(t!.modules.length).toBe(1);
    expect(t!.modules[0].id).toBe("h-1");
    expect(t!.narrative).toBe("Done");
  });

  it("returns null on missing required module fields", () => {
    const raw = `{
      "modules": [
        { "id": "h-1", "type": "hero" }
      ]
    }`;
    expect(parseTranscriptionFromLlm(raw, lowConfTokens)).toBeNull();
  });

  it("returns null on malformed JSON", () => {
    expect(parseTranscriptionFromLlm("not json at all", lowConfTokens)).toBeNull();
    expect(parseTranscriptionFromLlm("", lowConfTokens)).toBeNull();
  });

  it("rejects modules whose confidence is not high/medium/low", () => {
    const raw = `{
      "modules": [
        { "id": "h-1", "type": "hero", "version": 1, "confidence": "unsure" }
      ]
    }`;
    expect(parseTranscriptionFromLlm(raw, lowConfTokens)).toBeNull();
  });
});

describe("UAT FC REQ-28: buildHeroOnlyFallback (AC11)", () => {
  it("produces a transcription with a single hero module that passes the validator", () => {
    const digest = makeDigest();
    const fallback = buildHeroOnlyFallback({ digest });
    expect(fallback.modules.length).toBe(1);
    expect(fallback.modules[0].type).toBe("hero");
    expect(fallback.modules[0].confidence).toBe("low");

    const result = validateTranscription(fallback);
    expect(result.ok).toBe(true);
  });

  it("uses an h1 from the digest content tree as the business name when available", () => {
    const digest = makeDigest();
    const fallback = buildHeroOnlyFallback({ digest });
    const content = fallback.modules[0].content!;
    expect(content.heading).toBe("Acme Co");
  });

  it("AC11: narrative is operator-facing and explicitly names the fallback", () => {
    const fallback = buildHeroOnlyFallback({ digest: makeDigest() });
    expect(fallback.narrative).toMatch(/couldn't transcribe this site automatically/i);
    expect(fallback.narrative).toMatch(/hero-only draft/i);
  });
});
