// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { BuilderStore, createChatPanel } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

/**
 * AC-676 (redefined by REQ-36): when the in-flight turn settles, Stop is
 * hidden again and Send is restored — whether onSend resolves OR rejects
 * (cleared in a finally), and a rejected turn does not surface as an
 * unhandled rejection. Clicking Stop while in flight invokes the panel's
 * onStop handler (which the driver wires to the per-turn AbortController).
 */
describe("UAT AC-676: turn settle restores Send and hides Stop on resolve or reject; Stop aborts via onStop", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC676_turn_settle_restores_send_hides_stop_and_stop_invokes_onStop", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown): void => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", onUnhandled);

    try {
      // --- Case 1: onSend resolves -----------------------------------------
      const storeOk = new BuilderStore({
        siteDefinition: load1stContactSite(),
        chatHistory: [],
      });
      const panelOk = createChatPanel(document.body, {
        store: storeOk,
        onSend: () => Promise.resolve(),
      });

      panelOk.setInputMarkdown("resolve please");
      panelOk.sendButton.click();
      // Busy mid-flight: Send hidden (busy), Stop visible.
      expect(panelOk.sendButton.hasAttribute("data-fc-chat-send-busy")).toBe(true);
      expect(panelOk.stopButton.hasAttribute("data-fc-chat-stop-visible")).toBe(true);
      await flush();

      // Settled: Send restored (busy gone), Stop hidden again.
      expect(panelOk.sendButton.hasAttribute("data-fc-chat-send-busy")).toBe(false);
      expect(panelOk.stopButton.hasAttribute("data-fc-chat-stop-visible")).toBe(false);
      panelOk.destroy();

      // --- Case 2: onSend rejects ------------------------------------------
      const storeErr = new BuilderStore({
        siteDefinition: load1stContactSite(),
        chatHistory: [],
      });
      const panelErr = createChatPanel(document.body, {
        store: storeErr,
        onSend: () => Promise.reject(new Error("upstream blew up")),
      });

      panelErr.setInputMarkdown("reject please");
      panelErr.sendButton.click();
      expect(panelErr.sendButton.hasAttribute("data-fc-chat-send-busy")).toBe(true);
      await flush();

      // A rejected turn still clears busy in the finally — controls not stranded.
      expect(panelErr.sendButton.hasAttribute("data-fc-chat-send-busy")).toBe(false);
      expect(panelErr.stopButton.hasAttribute("data-fc-chat-stop-visible")).toBe(false);
      panelErr.destroy();

      await flush();
      expect(
        unhandled,
        "a rejected onSend must not surface as an unhandled rejection",
      ).toEqual([]);

      // --- Stop click invokes onStop while a turn is in flight -------------
      const storeStop = new BuilderStore({
        siteDefinition: load1stContactSite(),
        chatHistory: [],
      });
      const onStop = vi.fn();
      const panelStop = createChatPanel(document.body, {
        store: storeStop,
        onSend: () => new Promise<void>(() => {}),
        onStop,
      });
      panelStop.setInputMarkdown("a long running turn");
      panelStop.sendButton.click();
      expect(panelStop.stopButton.hasAttribute("data-fc-chat-stop-visible")).toBe(true);
      panelStop.stopButton.click();
      expect(onStop).toHaveBeenCalledTimes(1);
      panelStop.destroy();
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });
});
