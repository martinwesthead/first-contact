import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILDER_HTML = resolve(HERE, "../apps/control-app/public/builder.html");

/**
 * REQ-36: the builder chat panel was rebuilt to match the look + feel of
 * the XGD chat widget. These CSS assertions guard the visible contract
 * that the operator inspected against XGD's reference implementation
 * (xgendev-main/xgd_source/dashboard/static/index.html ~L3902-4500):
 *
 *   G1 — 13px font size throughout (currently 16px page default felt big).
 *   G2 — input is a single rounded pill (border-radius >= 20px).
 *   G3 — Send button is round, accent-coloured, glyph-only, inside the
 *        input wrapper (absolute position) — not a flex sibling.
 *   G4 — editor markdown typography is styled (headings, lists, code,
 *        blockquote, tables).
 *
 * G5 / G6 / G8 / G9 are covered in their own per-gap test files so a
 * regression on one doesn't mask another.
 */
describe("UAT FC REQ-36: builder.html ships the XGD-parity chat CSS contract", () => {
  const css = readFileSync(BUILDER_HTML, "utf8");

  it("G1: .fc-chat sets a 13px base font size (was inheriting 16px page default)", () => {
    const block = extractRule(css, ".fc-chat");
    expect(block, ".fc-chat rule must exist").not.toBeNull();
    expect(block).toMatch(/font-size\s*:\s*13px/);
  });

  it("G2: .fc-chat__editor is a rounded pill (border-radius >= 20px) with a single border that goes accent on focus", () => {
    const block = extractRule(css, ".fc-chat__editor");
    expect(block).not.toBeNull();
    const radiusMatch = block!.match(/border-radius\s*:\s*(\d+)px/);
    expect(radiusMatch, "border-radius must be set in px").not.toBeNull();
    expect(Number(radiusMatch![1])).toBeGreaterThanOrEqual(20);
    // Focus colour swap.
    expect(css).toMatch(
      /\.fc-chat__editor:focus-within\s*\{[^}]*border-color\s*:\s*#2563eb/,
    );
  });

  it("G3: Send button is absolutely positioned inside the editor wrapper, round (50% radius), and accent-coloured", () => {
    // Send & Stop share the absolute-position + round shape — they live in
    // a grouped selector together so the pill input can host either glyph.
    expect(css).toMatch(/\.fc-chat__send\s*,\s*\.fc-chat__stop\s*\{/);
    expect(css).toMatch(
      /\.fc-chat__send\s*,\s*\.fc-chat__stop\s*\{[^}]*position\s*:\s*absolute/,
    );
    expect(css).toMatch(
      /\.fc-chat__send\s*,\s*\.fc-chat__stop\s*\{[^}]*border-radius\s*:\s*50%/,
    );
    // Send-specific colour rule.
    expect(css).toMatch(/\.fc-chat__send\s*\{[^}]*background\s*:\s*#2563eb/);
  });

  it("G4: .fc-chat__editor-content styles markdown blocks (headings, lists, blockquote, code, pre, table) so pasted markdown renders", () => {
    // Selector existence — any one of these missing would render the
    // pasted block as raw text.
    expect(css).toMatch(/\.fc-chat__editor-content\s+h1\s*,/);
    expect(css).toMatch(/\.fc-chat__editor-content\s+ul\s*,/);
    expect(css).toMatch(/\.fc-chat__editor-content\s+blockquote\s*\{/);
    expect(css).toMatch(/\.fc-chat__editor-content\s+pre\s*\{/);
    expect(css).toMatch(/\.fc-chat__editor-content\s+code\s*\{/);
    expect(css).toMatch(/\.fc-chat__editor-content\s+table\s*\{/);
  });

  it("G4: pre/code typography sets a monospace-friendly font-size <= 13px", () => {
    expect(css).toMatch(
      /\.fc-chat__editor-content\s+pre\s*\{[^}]*font-size\s*:\s*1[0-3]px/,
    );
  });

  it("G3+G7: the busy-state CSS swaps Send for Stop (no spinner overlay)", () => {
    expect(css).toMatch(
      /\.fc-chat__send\[data-fc-chat-send-busy\]\s*\{[^}]*display\s*:\s*none/,
    );
    expect(css).toMatch(
      /\.fc-chat__stop\[data-fc-chat-stop-visible\]\s*\{[^}]*display\s*:\s*flex/,
    );
  });
});

function extractRule(css: string, selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`);
  const match = css.match(pattern);
  return match ? match[1]! : null;
}
