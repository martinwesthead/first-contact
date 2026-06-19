import { describe, expect, it } from "vitest";
import {
  validateTranscription,
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

describe("UAT FC REQ-28: validateTranscription enforces catalog membership (AC10)", () => {
  it("AC10: accepts a transcription whose modules all match the catalog", () => {
    const t = makeTranscription({
      modules: [
        {
          id: "hero-1",
          type: "hero",
          version: 1,
          variant: "bg-color",
          dials: { size: "md", align: "center", surface: "default" },
          content: { heading: "Welcome" },
          confidence: "high",
        },
        {
          id: "body-1",
          type: "text-block",
          version: 1,
          variant: "prose",
          content: { body: "Some content." },
          confidence: "medium",
        },
      ],
    });
    const result = validateTranscription(t);
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("AC10: rejects an unknown module type", () => {
    const t = makeTranscription({
      modules: [
        {
          id: "x-1",
          type: "carousel",
          version: 1,
          confidence: "low",
        },
      ],
    });
    const result = validateTranscription(t);
    expect(result.ok).toBe(false);
    expect(result.issues[0].path).toBe("/modules/0/type");
    expect(result.issues[0].message).toMatch(/unknown module type 'carousel'/);
  });

  it("AC10: rejects a wrong version for a known type", () => {
    const t = makeTranscription({
      modules: [
        {
          id: "hero-1",
          type: "hero",
          version: 2,
          confidence: "high",
          content: { heading: "x" },
        },
      ],
    });
    const result = validateTranscription(t);
    expect(result.ok).toBe(false);
    const versionIssue = result.issues.find((i) => i.path === "/modules/0/version");
    expect(versionIssue).toBeDefined();
    expect(versionIssue!.message).toMatch(/has version 1, got 2/);
  });

  it("AC10: rejects a variant not in the module's variants list", () => {
    const t = makeTranscription({
      modules: [
        {
          id: "hero-1",
          type: "hero",
          version: 1,
          variant: "split",
          confidence: "high",
          content: { heading: "x" },
        },
      ],
    });
    const result = validateTranscription(t);
    expect(result.ok).toBe(false);
    const variantIssue = result.issues.find((i) => i.path === "/modules/0/variant");
    expect(variantIssue).toBeDefined();
    expect(variantIssue!.message).toMatch(
      /expected one of \[bg-color, bg-image\], got 'split'/,
    );
  });

  it("AC10: rejects a dial value not in the dial's allowed enumeration", () => {
    const t = makeTranscription({
      modules: [
        {
          id: "hero-1",
          type: "hero",
          version: 1,
          variant: "bg-color",
          dials: { size: "xxl" },
          confidence: "medium",
          content: { heading: "x" },
        },
      ],
    });
    const result = validateTranscription(t);
    expect(result.ok).toBe(false);
    const dialIssue = result.issues.find((i) => i.path === "/modules/0/dials/size");
    expect(dialIssue).toBeDefined();
    expect(dialIssue!.message).toMatch(/expected one of \[sm, md, lg\], got 'xxl'/);
  });

  it("AC10: rejects content that fails the module's contentSchema (missing required field)", () => {
    const t = makeTranscription({
      modules: [
        {
          id: "hero-1",
          type: "hero",
          version: 1,
          variant: "bg-color",
          confidence: "high",
          // hero.contentSchema.heading is required.
          content: { eyebrow: "Hello" },
        },
      ],
    });
    const result = validateTranscription(t);
    expect(result.ok).toBe(false);
    const contentIssue = result.issues.find((i) =>
      i.path.includes("/content/heading"),
    );
    expect(contentIssue).toBeDefined();
    expect(contentIssue!.message).toMatch(/required field is missing/);
  });

  it("AC10: rejects duplicate module ids within the transcription", () => {
    const t = makeTranscription({
      modules: [
        {
          id: "block-1",
          type: "text-block",
          version: 1,
          confidence: "high",
          content: { body: "first" },
        },
        {
          id: "block-1",
          type: "text-block",
          version: 1,
          confidence: "high",
          content: { body: "second" },
        },
      ],
    });
    const result = validateTranscription(t);
    expect(result.ok).toBe(false);
    const dupIssue = result.issues.find(
      (i) => i.path === "/modules/1/id" && i.message.includes("duplicate"),
    );
    expect(dupIssue).toBeDefined();
  });

  it("returns machine-readable issues for AI self-correction", () => {
    const t = makeTranscription({
      modules: [
        {
          id: "h-1",
          type: "hero",
          version: 1,
          variant: "bg-color",
          dials: { size: "huge" },
          content: { heading: "x" },
          confidence: "low",
        },
      ],
    });
    const result = validateTranscription(t);
    expect(result.ok).toBe(false);
    expect(result.issues[0]).toHaveProperty("path");
    expect(result.issues[0]).toHaveProperty("message");
    // Path is a JSON-Pointer-ish slash form pointing at the failing field.
    expect(result.issues[0].path).toMatch(/^\/modules\/0\//);
  });
});
