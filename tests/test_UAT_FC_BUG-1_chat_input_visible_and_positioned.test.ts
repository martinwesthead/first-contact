import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILDER_HTML = resolve(HERE, "../apps/control-app/public/builder.html");

describe("UAT FC BUG-1: builder.html ships the CSS the TipTap chat editor needs to render", () => {
  // REQ-13 swapped the chat input from <textarea class=fc-chat__textarea> to a
  // TipTap editor mounted into <div class=fc-chat__editor> with the editable
  // surface carrying class fc-chat__editor-content. The CSS in builder.html
  // still styled the dead .fc-chat__textarea selector, so the editor wrapper
  // collapsed to zero size and the Send button took over the row.
  const css = readFileSync(BUILDER_HTML, "utf8");

  it("defines a .fc-chat__editor rule with flex sizing so the editor grows to fill the row", () => {
    const block = extractRule(css, ".fc-chat__editor");
    expect(block, ".fc-chat__editor rule must exist").not.toBeNull();
    // The editor wrapper must consume the row, leaving the Send button on the right.
    expect(block).toMatch(/flex\s*:\s*1\s+1\s+auto/);
  });

  it("defines a .fc-chat__editor-content rule that makes the typed text visible", () => {
    const block = extractRule(css, ".fc-chat__editor-content");
    expect(block, ".fc-chat__editor-content rule must exist").not.toBeNull();
    // Without an explicit colour the editor text inherits #e2e8f0 from body, which
    // is fine — but the rule must at least set padding so the caret is not flush
    // against the border, and a min-height so the empty editor is visible.
    expect(block).toMatch(/min-height\s*:/);
    expect(block).toMatch(/padding\s*:/);
  });

  it("does not retain the dead .fc-chat__textarea rule (the textarea element no longer exists)", () => {
    // Orphan rules are not a runtime bug, but leaving them in the stylesheet
    // is exactly what caused the misdiagnosis here. Strip it as part of the fix.
    expect(extractRule(css, ".fc-chat__textarea")).toBeNull();
  });

  it(".fc-chat__input row keeps the editor on the left and the send button on the right (DOM order × flex direction)", () => {
    // The bug report said "send button on the wrong side". DOM order in
    // chat-panel.ts is [editor][send], so as long as .fc-chat__input is a
    // row-direction flex container (not row-reverse) the visual order is
    // editor → send.
    const block = extractRule(css, ".fc-chat__input");
    expect(block).not.toBeNull();
    expect(block).toMatch(/display\s*:\s*flex/);
    expect(block).not.toMatch(/flex-direction\s*:\s*row-reverse/);
  });
});

/**
 * Extract the body of the first CSS rule whose selector exactly matches
 * `selector` (no descendant / pseudo variants). Returns null if absent.
 */
function extractRule(css: string, selector: string): string | null {
  // Escape regex metacharacters in the selector.
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Match "<selector> {" optionally with whitespace, capture until the matching brace.
  const pattern = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`);
  const match = css.match(pattern);
  return match ? match[1]! : null;
}
