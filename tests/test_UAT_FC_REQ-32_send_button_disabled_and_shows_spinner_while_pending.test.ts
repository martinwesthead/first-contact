// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { BuilderStore, createChatPanel } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

describe("UAT FC REQ-32: send button is disabled and shows a spinner while onSend is pending", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("disables the Send button and sets aria-busy while the in-flight onSend promise has not resolved", async () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    let release: () => void = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const panel = createChatPanel(document.body, {
      store,
      onSend: () => pending,
    });

    panel.setInputMarkdown("hello");
    panel.sendButton.click();
    // Let the microtask that starts submit() run.
    await Promise.resolve();

    expect(panel.sendButton.disabled).toBe(true);
    expect(panel.sendButton.getAttribute("aria-busy")).toBe("true");

    release();
    await pending;
    await Promise.resolve();
    await Promise.resolve();

    expect(panel.sendButton.disabled).toBe(false);
    expect(panel.sendButton.getAttribute("aria-busy")).toBeNull();
  });
});
