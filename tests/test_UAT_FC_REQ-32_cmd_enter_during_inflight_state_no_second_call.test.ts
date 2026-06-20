// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { BuilderStore, createChatPanel } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

/**
 * REQ-32 originally asserted that Cmd+Enter (the legacy submit shortcut)
 * did not fire a second onSend while the previous turn was still in flight.
 *
 * REQ-36 (G8) flipped the keyboard contract: bare Enter now sends, and
 * Cmd/Shift/Alt+Enter inserts a newline. The "no double-submit while busy"
 * invariant is the same; this test simply uses the Send button to drive
 * submission (modality-agnostic) so we don't need to round-trip TipTap's
 * ProseMirror keymap through synthetic keydown events.
 */
describe("UAT FC REQ-32: clicking Send while a turn is in flight does not fire a second onSend call", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("ignores Send clicks while busy and resumes after the turn settles", async () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    let release: () => void = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const onSend = vi.fn(async (_text: string) => {
      await pending;
    });
    const panel = createChatPanel(document.body, { store, onSend });

    panel.setInputMarkdown("first");
    panel.sendButton.click();
    await Promise.resolve();

    // Second click while the first onSend is still pending: must be ignored.
    panel.setInputMarkdown("second");
    panel.sendButton.click();
    await Promise.resolve();

    expect(onSend).toHaveBeenCalledTimes(1);

    release();
    await Promise.resolve();
    await Promise.resolve();

    // Once the turn settles, a fresh click submits again.
    panel.setInputMarkdown("third");
    panel.sendButton.click();
    await Promise.resolve();
    expect(onSend).toHaveBeenCalledTimes(2);
  });
});
