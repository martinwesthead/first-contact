import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const transcribeSrc = resolve(here, "../packages/extractor/src/transcribe.ts");
const transcribeHandlerSrc = resolve(
  here,
  "../apps/control-app/src/operator/transcribe-site.ts",
);
const extractorIndexSrc = resolve(here, "../packages/extractor/src/index.ts");

function read(path: string): string {
  return readFileSync(path, "utf-8");
}

describe("UAT FC REQ-30: legacy synthesis code is removed (AC5, AC11)", () => {
  it("AC5: packages/extractor/src/transcribe.ts no longer defines the Opus-synthesis helpers", () => {
    const src = read(transcribeSrc);
    expect(src).not.toMatch(/export function composePromptForTranscription\b/);
    expect(src).not.toMatch(/export function buildSiteFromTranscription\b/);
    expect(src).not.toMatch(/export function validateTranscription\b/);
    expect(src).not.toMatch(/export function parseTranscriptionFromLlm\b/);
    expect(src).not.toMatch(/export function buildHeroOnlyFallback\b/);
  });

  it("AC5: extractor index.ts no longer re-exports the removed helpers", () => {
    const src = read(extractorIndexSrc);
    for (const name of [
      "composePromptForTranscription",
      "buildSiteFromTranscription",
      "validateTranscription",
      "parseTranscriptionFromLlm",
      "buildHeroOnlyFallback",
    ]) {
      expect(src).not.toMatch(new RegExp(`\\b${name}\\b`));
    }
  });

  it("AC11: transcribe-site.ts contains no legacy/fallback synthesis branch", () => {
    const src = read(transcribeHandlerSrc);
    expect(src).not.toMatch(/buildSiteFromTranscription/);
    expect(src).not.toMatch(/buildHeroOnlyFallback/);
    expect(src).not.toMatch(/composePromptForTranscription/);
    expect(src).not.toMatch(/parseTranscriptionFromLlm/);
    expect(src).not.toMatch(/validateTranscription/);
    expect(src).not.toMatch(/callOpusForTranscription/);
    expect(src).not.toMatch(/attemptTranscription/);
    expect(src).not.toMatch(/fellBackToHero/);
  });

  it("AC5: extractor still exports the data-shape helpers we keep", () => {
    const src = read(extractorIndexSrc);
    for (const name of [
      "deriveThemeTokens",
      "collectReferencedAssetUrls",
      "rewriteAssetRefs",
    ]) {
      expect(src).toMatch(new RegExp(`\\b${name}\\b`));
    }
  });
});
