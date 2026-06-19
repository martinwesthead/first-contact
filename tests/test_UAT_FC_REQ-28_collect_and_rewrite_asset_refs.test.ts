import { describe, expect, it } from "vitest";
import {
  collectReferencedAssetUrls,
  rewriteAssetRefs,
  type Transcription,
} from "../packages/extractor/src/transcribe.js";

function makeTranscription(overrides: Partial<Transcription> = {}): Transcription {
  return {
    themeTokens: {
      palette: {},
      typography: { family: {} },
      confidence: { palette: "low", typography: "low", layout: "low" },
    },
    modules: [],
    narrative: "",
    ...overrides,
  };
}

describe("UAT FC REQ-28: collectReferencedAssetUrls + rewriteAssetRefs (AC7 dedup, AC16 swap)", () => {
  it("AC7: walks all module content and dedupes URLs across multiple references", () => {
    const t = makeTranscription({
      modules: [
        {
          id: "hero-1",
          type: "hero",
          version: 1,
          variant: "bg-image",
          confidence: "high",
          content: {
            heading: "Welcome",
            image: { id: "img-1", src: "https://acme.test/hero.jpg", alt: "Hero" },
          },
        },
        {
          id: "services-1",
          type: "services-grid",
          version: 1,
          variant: "three-col",
          confidence: "medium",
          content: {
            items: [
              {
                icon: { id: "ic-1", src: "https://acme.test/icon.svg", alt: "Icon 1" },
                title: "A",
                body: "...",
              },
              {
                icon: { id: "ic-2", src: "https://acme.test/hero.jpg", alt: "Icon 2" },
                title: "B",
                body: "...",
              },
            ],
          },
        },
      ],
    });
    const urls = collectReferencedAssetUrls(t);
    expect(urls).toContain("https://acme.test/hero.jpg");
    expect(urls).toContain("https://acme.test/icon.svg");
    expect(urls.length).toBe(2);
  });

  it("ignores asset-ref values whose src is not an http(s) URL", () => {
    const t = makeTranscription({
      modules: [
        {
          id: "hero-1",
          type: "hero",
          version: 1,
          variant: "bg-color",
          confidence: "high",
          content: {
            heading: "x",
            image: { id: "img-1", src: "/local/img.png", alt: "Local" },
          },
        },
      ],
    });
    const urls = collectReferencedAssetUrls(t);
    expect(urls).toEqual([]);
  });

  it("AC16: rewriteAssetRefs replaces matching src with /assets/{r2Key}; non-matching unchanged", () => {
    const t = makeTranscription({
      modules: [
        {
          id: "hero-1",
          type: "hero",
          version: 1,
          variant: "bg-image",
          confidence: "high",
          content: {
            heading: "x",
            image: { id: "img-1", src: "https://acme.test/hero.jpg", alt: "Hero" },
          },
        },
        {
          id: "services-1",
          type: "services-grid",
          version: 1,
          variant: "three-col",
          confidence: "medium",
          content: {
            items: [
              {
                icon: { id: "ic-1", src: "https://acme.test/icon.svg", alt: "Icon" },
                title: "A",
                body: "...",
              },
            ],
          },
        },
      ],
    });
    const map = new Map<string, string>();
    map.set("https://acme.test/hero.jpg", "sites/s/imports/abc123def456.jpg");
    // icon.svg has no R2 entry — should remain external.

    const rewritten = rewriteAssetRefs(t, map);
    const heroImg = rewritten.modules[0].content!.image as Record<string, string>;
    expect(heroImg.src).toBe("/assets/sites/s/imports/abc123def456.jpg");
    expect(heroImg.alt).toBe("Hero");

    const items = rewritten.modules[1].content!.items as Array<{ icon: { src: string } }>;
    expect(items[0].icon.src).toBe("https://acme.test/icon.svg");
  });

  it("rewriteAssetRefs returns the original transcription when the map is empty", () => {
    const t = makeTranscription({
      modules: [
        {
          id: "hero-1",
          type: "hero",
          version: 1,
          confidence: "high",
          content: {
            heading: "x",
            image: { id: "img-1", src: "https://acme.test/hero.jpg", alt: "Hero" },
          },
        },
      ],
    });
    const rewritten = rewriteAssetRefs(t, new Map());
    expect(rewritten).toBe(t);
  });
});
