// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { BuilderStore, createChatPanel } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

describe("UAT FC REQ-32: send button returns to ready state after onSend resolves", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("clears busy state and re-enables the button when the onSend promise resolves", async () => {
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
    await Promise.resolve();
    expect(panel.sendButton.disabled).toBe(true);

    release();
    await pending;
    // Let the finally block run.
    await Promise.resolve();
    await Promise.resolve();

    expect(panel.sendButton.disabled).toBe(false);
    expect(panel.sendButton.getAttribute("aria-busy")).toBeNull();
  });
});
