// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { BuilderStore, createChatPanel } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

describe("UAT FC REQ-32: send button returns to ready state after onSend rejects", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("clears busy state and re-enables the button when the onSend promise rejects, so a failed turn does not strand the UI", async () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    let reject: (err: Error) => void = () => {};
    const pending = new Promise<void>((_resolve, rej) => {
      reject = rej;
    });
    // Attach a no-op rejection handler eagerly so neither the panel-side nor
    // this test sees an unhandled rejection when we trigger the failure below.
    const swallowed = pending.catch(() => {});
    const panel = createChatPanel(document.body, {
      store,
      onSend: () => pending,
    });

    panel.setInputMarkdown("oops");
    panel.sendButton.click();
    await Promise.resolve();
    expect(panel.sendButton.disabled).toBe(true);

    reject(new Error("network down"));
    await swallowed;
    await Promise.resolve();
    await Promise.resolve();

    expect(panel.sendButton.disabled).toBe(false);
    expect(panel.sendButton.getAttribute("aria-busy")).toBeNull();
  });
});
