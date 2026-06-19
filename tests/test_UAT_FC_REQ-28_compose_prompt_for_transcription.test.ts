import { describe, expect, it } from "vitest";
import {
  NOT_DETECTED,
  SCHEMA_VERSION,
  type ReferenceDigest,
} from "../packages/extractor/src/index.js";
import { composePromptForTranscription } from "../packages/extractor/src/transcribe.js";

function makeDigest(): ReferenceDigest {
  return {
    schemaVersion: SCHEMA_VERSION,
    sourceUrl: "https://acme.test/about",
    fetchedAt: "2026-06-18T00:00:00.000Z",
    fetchPath: "rendered",
    summary: "Acme's about page — bold typography, hero, two-col services.",
    signals: {
      palette: {
        background: "#fff",
        body: "#222",
        accent: "#16a34a",
        cta: "#2563eb",
        supporting: [],
      },
      typography: {
        body: { family: "Inter", size: NOT_DETECTED, weight: NOT_DETECTED },
        h1: { family: "Playfair Display", size: NOT_DETECTED, weight: NOT_DETECTED },
        h2: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
        h3: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
        primaryPair: { body: "Inter", heading: "Playfair Display" },
      },
      layout: { maxContentWidth: 1024, bias: "centered", density: "balanced" },
      imagery: { imgCount: 3, backgroundCount: 1, videoCount: 0, heroDetected: true },
      content: {
        headings: [
          { level: 1, text: "Acme" },
          { level: 2, text: "Services" },
        ],
        navLinks: [],
        formFields: [],
        listGroupCount: 1,
        sectionCount: 3,
      },
      assetInventory: [
        {
          url: "https://acme.test/hero.jpg",
          kind: "img",
          classification: "hero",
          alt: "Hero image",
          references: 1,
        },
        {
          url: "https://acme.test/team.jpg",
          kind: "img",
          classification: "headshot",
          alt: "Team",
          references: 1,
        },
      ],
    },
    commentary: { perSection: {}, whatsMissing: [] },
    screenshotKeys: { desktop: "screenshots/abc.png" },
  };
}

describe("UAT FC REQ-28: composePromptForTranscription (system + user prompt)", () => {
  it("includes the framework module catalog with id+version+variants+dials+contentSchema", () => {
    const { system, user } = composePromptForTranscription(makeDigest());

    // System prompt names the structured output rules.
    expect(system).toMatch(/SINGLE JSON object/);
    expect(system).toMatch(/catalog/i);

    // User prompt embeds catalog + asset inventory + signals.
    expect(user).toContain("Acme's about page");
    expect(user).toContain("https://acme.test/about");
    expect(user).toContain("Module catalog");
    expect(user).toContain('"id": "hero"');
    expect(user).toContain('"id": "text-block"');
    expect(user).toContain('"variants"');
    expect(user).toContain('"dials"');
    expect(user).toContain('"contentSchema"');
  });

  it("embeds the asset inventory so the LLM picks from real URLs only", () => {
    const { user } = composePromptForTranscription(makeDigest());
    expect(user).toContain("https://acme.test/hero.jpg");
    expect(user).toContain("https://acme.test/team.jpg");
    expect(user).toMatch(/Asset inventory/i);
  });

  it("output mentions the confidence field expectation", () => {
    const { system } = composePromptForTranscription(makeDigest());
    expect(system).toMatch(/confidence/);
    expect(system).toMatch(/high|medium|low/);
  });
});
