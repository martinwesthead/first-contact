// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BuilderStore, createChatPanel } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILDER_HTML = resolve(HERE, "../apps/control-app/public/builder.html");

/**
 * AC-673 (redefined by REQ-36): the in-flight affordance is a round
 * Send→Stop swap, NOT a CSS spinner. The capsule carries a round accent Send
 * button (▶); while a turn is in flight Send gains data-fc-chat-send-busy
 * (hidden) and a round red Stop button (■) is revealed via
 * data-fc-chat-stop-visible. The prior .fc-chat__send-spinner rule is gone.
 */
describe("UAT AC-673: in-flight affordance is a round Send→Stop swap (no CSS spinner)", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC673_send_to_stop_swap_no_spinner_while_in_flight", () => {
    // --- DOM boundary: a turn is in flight (onSend never settles) ----------
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const panel = createChatPanel(document.body, {
      store,
      onSend: () => new Promise<void>(() => {}),
    });

    // Send is the round accent button with the play glyph; Stop the square one.
    expect(panel.sendButton.getAttribute("data-fc-chat-send")).not.toBeNull();
    expect(panel.sendButton.textContent).toBe("▶");
    expect(panel.stopButton.getAttribute("data-fc-chat-stop")).not.toBeNull();
    expect(panel.stopButton.textContent).toBe("■");

    panel.setInputMarkdown("make the hero bigger");
    panel.sendButton.click();

    // While in flight: Send is busy/hidden, Stop is revealed.
    expect(panel.sendButton.hasAttribute("data-fc-chat-send-busy")).toBe(true);
    expect(panel.stopButton.hasAttribute("data-fc-chat-stop-visible")).toBe(true);

    panel.destroy();

    // --- CSS contract: builder.html ships the round Send/Stop swap rules ----
    const css = readFileSync(BUILDER_HTML, "utf8");

    // Round Send and Stop, grouped, absolutely positioned in the capsule.
    expect(css).toMatch(/\.fc-chat__send\s*,\s*\.fc-chat__stop\s*\{/);
    expect(css).toMatch(
      /\.fc-chat__send\s*,\s*\.fc-chat__stop\s*\{[^}]*border-radius\s*:\s*50%/,
    );
    // The busy state hides Send and reveals Stop (no spinner overlay).
    expect(css).toMatch(
      /\.fc-chat__send\[data-fc-chat-send-busy\]\s*\{[^}]*display\s*:\s*none/,
    );
    expect(css).toMatch(
      /\.fc-chat__stop\[data-fc-chat-stop-visible\]\s*\{[^}]*display\s*:\s*flex/,
    );

    // The removed REQ-32 spinner rule is gone.
    expect(css).not.toContain(".fc-chat__send-spinner");
    expect(css).not.toContain("fc-chat-spin");
  });
});
