import { describe, expect, it } from "vitest";
import { parsePalette, NOT_DETECTED } from "../packages/extractor/src/index.js";

describe("UAT AC-587: palette roles inferred with a capped supporting list", () => {
  it("test_UAT_AC587_palette_roles_inferred_with_capped_supporting", () => {
    // (a) A page declaring all four role colours plus seven extras.
    const declaredHtml = `<!doctype html><html><head><style>
      body { background: #ffffff; color: #222222; }
      button, .cta { background-color: #2563eb; }
      h1, h2 { color: #16a34a; }
      .s1 { color: #111111; }
      .s2 { color: #333333; }
      .s3 { color: #444444; }
      .s4 { color: #555555; }
      .s5 { color: #666666; }
      .s6 { color: #777777; }
      .s7 { color: #888888; }
    </style></head><body></body></html>`;
    const palette = parsePalette(declaredHtml, "https://x.test/");

    // Each role holds the colour declared by its heuristic selector.
    expect(palette.background.toLowerCase()).toBe("#ffffff");
    expect(palette.body.toLowerCase()).toBe("#222222");
    expect(palette.accent.toLowerCase()).toBe("#16a34a");
    expect(palette.cta.toLowerCase()).toBe("#2563eb");

    // Supporting lists the extras, capped at 6 even though seven were declared.
    const supporting = palette.supporting.map((s) => s.toLowerCase());
    expect(supporting.length).toBe(6);
    expect(supporting.length).toBeLessThanOrEqual(6);
    // No role colour leaks into supporting.
    for (const role of ["#ffffff", "#222222", "#16a34a", "#2563eb"]) {
      expect(supporting).not.toContain(role);
    }
    // The first extras (document order) are present.
    expect(supporting).toContain("#111111");

    // (b) A page with no colour declarations at all.
    const bareHtml = `<!doctype html><html><head></head><body><p>hi</p></body></html>`;
    const bare = parsePalette(bareHtml, "https://x.test/");
    expect(bare.background).toBe(NOT_DETECTED);
    expect(bare.body).toBe(NOT_DETECTED);
    expect(bare.accent).toBe(NOT_DETECTED);
    expect(bare.cta).toBe(NOT_DETECTED);
    expect(bare.supporting).toEqual([]);
  });
});
