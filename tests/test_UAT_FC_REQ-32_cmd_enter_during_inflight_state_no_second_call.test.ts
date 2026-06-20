// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { BuilderStore, createChatPanel } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

describe("UAT FC REQ-32: Cmd+Enter while a turn is in flight does not fire a second onSend call", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("ignores Cmd+Enter submit while busy and resumes after the turn settles", async () => {
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
    panel.editorRoot.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    await Promise.resolve();

    panel.setInputMarkdown("second");
    panel.editorRoot.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    await Promise.resolve();

    expect(onSend).toHaveBeenCalledTimes(1);

    release();
    await Promise.resolve();
    await Promise.resolve();

    panel.editorRoot.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    await Promise.resolve();
    expect(onSend).toHaveBeenCalledTimes(2);
  });
});
