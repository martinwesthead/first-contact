// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { BuilderStore, createChatPanel } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe("UAT AC-676: send button resets to 'Send' and re-enables after the turn resolves or rejects", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC676_send_button_resets_after_resolve_or_reject", async () => {
    // Capture any unhandled rejection raised on the page during the run — the
    // rejecting case must NOT surface one (runSubmit .catch-guards the promise).
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
      // Busy mid-flight (synchronous up to the onSend await).
      expect(panelOk.sendButton.disabled).toBe(true);
      await flush();

      // Turn settled: button re-enabled, busy markers gone, label restored.
      expect(panelOk.sendButton.disabled).toBe(false);
      expect(panelOk.sendButton.getAttribute("aria-busy")).toBeNull();
      expect(panelOk.sendButton.hasAttribute("data-fc-chat-send-busy")).toBe(
        false,
      );
      expect(
        panelOk.sendButton.querySelector(".fc-chat__send-label")!.textContent,
      ).toBe("Send");

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
      expect(panelErr.sendButton.disabled).toBe(true);
      await flush();

      // A rejected turn still clears busy in the finally — the button is not
      // stranded disabled/spinning.
      expect(panelErr.sendButton.disabled).toBe(false);
      expect(panelErr.sendButton.getAttribute("aria-busy")).toBeNull();
      expect(panelErr.sendButton.hasAttribute("data-fc-chat-send-busy")).toBe(
        false,
      );
      expect(
        panelErr.sendButton.querySelector(".fc-chat__send-label")!.textContent,
      ).toBe("Send");

      panelErr.destroy();

      // Give any stray rejection a chance to surface before asserting.
      await flush();
      expect(
        unhandled,
        "a rejected onSend must not surface as an unhandled rejection",
      ).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });
});
