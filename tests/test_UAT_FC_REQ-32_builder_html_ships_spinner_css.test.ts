import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILDER_HTML = resolve(HERE, "../apps/control-app/public/builder.html");

describe("UAT FC REQ-32: builder.html ships the CSS the busy-state send button needs", () => {
  const css = readFileSync(BUILDER_HTML, "utf8");

  it("defines a .fc-chat__send-spinner rule with a rotation animation", () => {
    const block = extractRule(css, ".fc-chat__send-spinner");
    expect(block, ".fc-chat__send-spinner rule must exist").not.toBeNull();
    expect(block).toMatch(/animation\s*:[^;]*fc-chat-spin/);
  });

  it("hides the label and shows the spinner when the button has aria-busy=true", () => {
    expect(css).toMatch(
      /\.fc-chat__send\[aria-busy="true"\]\s+\.fc-chat__send-label\s*\{[^}]*display\s*:\s*none/,
    );
    expect(css).toMatch(
      /\.fc-chat__send\[aria-busy="true"\]\s+\.fc-chat__send-spinner\s*\{[^}]*display\s*:\s*inline-block/,
    );
  });

  it("defines the @keyframes used by the spinner", () => {
    expect(css).toMatch(/@keyframes\s+fc-chat-spin/);
  });

  it("disables hover affordance and dims the button when disabled", () => {
    const block = extractRule(css, ".fc-chat__send:disabled");
    expect(block, ".fc-chat__send:disabled rule must exist").not.toBeNull();
    expect(block).toMatch(/cursor\s*:\s*not-allowed/);
  });
});

function extractRule(css: string, selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`);
  const match = css.match(pattern);
  return match ? match[1]! : null;
}
