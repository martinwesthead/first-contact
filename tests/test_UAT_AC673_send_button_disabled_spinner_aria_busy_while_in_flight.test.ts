// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BuilderStore, createChatPanel } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILDER_HTML = resolve(HERE, "../apps/control-app/public/builder.html");

describe("UAT AC-673: send button disabled with a CSS-only spinner and aria-busy while a turn is in flight", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC673_send_button_disabled_spinner_aria_busy_while_in_flight", () => {
    // --- DOM boundary: a turn is in flight (onSend never settles) ----------
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    // A pending promise that we deliberately never resolve keeps the panel in
    // its in-flight state for the duration of the assertions.
    const panel = createChatPanel(document.body, {
      store,
      onSend: () => new Promise<void>(() => {}),
    });

    panel.setInputMarkdown("make the hero bigger");
    panel.sendButton.click();

    // The Send button locks: disabled, aria-busy="true", and the busy marker
    // attribute the stylesheet keys off are all set.
    expect(panel.sendButton.disabled).toBe(true);
    expect(panel.sendButton.getAttribute("aria-busy")).toBe("true");
    expect(panel.sendButton.hasAttribute("data-fc-chat-send-busy")).toBe(true);

    // Both the label and the CSS-only spinner element exist on the button. The
    // aria-busy="true" state is the DOM hook the stylesheet uses to hide the
    // label and reveal the spinner (asserted against the shipped CSS below).
    const label = panel.sendButton.querySelector(".fc-chat__send-label");
    const spinner = panel.sendButton.querySelector(".fc-chat__send-spinner");
    expect(label, ".fc-chat__send-label must exist").not.toBeNull();
    expect(label!.textContent).toBe("Send");
    expect(spinner, ".fc-chat__send-spinner must exist").not.toBeNull();
    // The spinner is a pure DOM element, not an <img>/<svg> asset.
    expect(spinner!.tagName).toBe("SPAN");
    expect(spinner!.querySelector("svg, img")).toBeNull();

    panel.destroy();

    // --- CSS contract: builder.html ships the spinner + swap rules ----------
    const css = readFileSync(BUILDER_HTML, "utf8");

    // The spinner is a pure-CSS rotating element driven by a keyframes rule.
    expect(css).toMatch(
      /\.fc-chat__send-spinner\s*\{[^}]*animation\s*:\s*fc-chat-spin/,
    );
    expect(css).toMatch(/@keyframes\s+fc-chat-spin/);

    // aria-busy="true" hides the label and shows the spinner — the label/spinner
    // swap is purely CSS, no JS toggling of display.
    expect(css).toMatch(
      /\.fc-chat__send\[aria-busy="true"\]\s+\.fc-chat__send-label\s*\{[^}]*display\s*:\s*none/,
    );
    expect(css).toMatch(
      /\.fc-chat__send\[aria-busy="true"\]\s+\.fc-chat__send-spinner\s*\{[^}]*display\s*:\s*inline-block/,
    );

    // The button keeps a min-width so the row does not reflow when the label is
    // swapped out for the (smaller) spinner.
    expect(css).toMatch(/\.fc-chat__send\s*\{[^}]*min-width\s*:/);
  });
});
