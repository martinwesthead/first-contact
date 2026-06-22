// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { BuilderStore, createChatPanel } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

describe("UAT FC REQ-32: clicking Send while a turn is in flight does not fire a second onSend call", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("ignores subsequent send-button clicks until the in-flight onSend promise resolves", async () => {
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
    // The operator types more text while waiting and clicks again.
    panel.setInputMarkdown("second");
    panel.sendButton.click();
    panel.sendButton.click();
    await Promise.resolve();

    expect(onSend).toHaveBeenCalledTimes(1);

    release();
    await Promise.resolve();
    await Promise.resolve();
    // After the turn settles the button works again.
    panel.sendButton.click();
    await Promise.resolve();
    expect(onSend).toHaveBeenCalledTimes(2);
  });
});
