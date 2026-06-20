import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILDER_HTML = resolve(HERE, "../apps/control-app/public/builder.html");

/**
 * REQ-32 originally asserted that `.fc-chat__send` ran a CSS spinner
 * (`fc-chat-spin` keyframes + `.fc-chat__send-spinner` overlay) while a
 * chat turn was in flight, so the operator had visible feedback that the
 * request was still pending.
 *
 * REQ-36 (G3 / G7) replaced that pattern with the XGD-parity Send/Stop
 * affordance: the round `▶` send button is hidden mid-turn and a round
 * red `■` stop button takes its place, which doubles as the abort
 * affordance for the streaming response. The spinner is gone.
 *
 * This test now guards the new contract: the busy-state CSS hides the
 * Send button and shows the Stop button. Keeping the same test file so
 * future REQ-32 regressions stay anchored to the same name.
 */
describe("UAT FC REQ-32: builder.html ships the busy-state Send/Stop swap CSS", () => {
  const css = readFileSync(BUILDER_HTML, "utf8");

  it("defines a .fc-chat__stop rule with the round red Stop affordance", () => {
    // Shared shape (position/size/radius) sits in the grouped selector;
    // the colour/visibility split into per-button rules below it.
    expect(css).toMatch(/\.fc-chat__send\s*,\s*\.fc-chat__stop\s*\{/);
    expect(css).toMatch(
      /\.fc-chat__stop\s*\{[^}]*background\s*:\s*#dc2626/,
    );
    expect(css).toMatch(/\.fc-chat__stop\s*\{[^}]*display\s*:\s*none/);
  });

  it("hides the Send button when it has the busy data attribute and shows the Stop button when visible", () => {
    expect(css).toMatch(
      /\.fc-chat__send\[data-fc-chat-send-busy\]\s*\{[^}]*display\s*:\s*none/,
    );
    expect(css).toMatch(
      /\.fc-chat__stop\[data-fc-chat-stop-visible\]\s*\{[^}]*display\s*:\s*flex/,
    );
  });

  it("disables hover affordance and dims the Send button when disabled", () => {
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
