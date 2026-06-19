import { describe, expect, it } from "vitest";
import { parsePalette } from "../packages/extractor/src/index.js";

describe("UAT FC REQ-21: palette role inference (AC 3)", () => {
  it("AC3: extracts background, body, cta, accent from a page that declares all four", () => {
    const html = `<!doctype html><html><head><style>
      body { background: #fff; color: #222; }
      button, .cta { background-color: #2563eb; }
      h1, h2 { color: #16a34a; }
    </style></head><body></body></html>`;
    const palette = parsePalette(html, "https://x.test/");
    expect(palette.background.toLowerCase()).toBe("#fff");
    expect(palette.body.toLowerCase()).toBe("#222");
    expect(palette.cta.toLowerCase()).toBe("#2563eb");
    expect(palette.accent.toLowerCase()).toBe("#16a34a");
  });

  it("supporting colors include extras not assigned to a role", () => {
    const html = `<!doctype html><html><head><style>
      body { background: #fff; color: #222; }
      button { background-color: #2563eb; }
      h1 { color: #16a34a; }
      .footer { background-color: #f3f4f6; color: #6b7280; }
    </style></head><body></body></html>`;
    const palette = parsePalette(html, "https://x.test/");
    // Footer colors should NOT be picked as primary roles and should land
    // in supporting.
    const supporting = palette.supporting.map((s) => s.toLowerCase());
    expect(supporting).toContain("#f3f4f6");
    expect(supporting).toContain("#6b7280");
  });
});
