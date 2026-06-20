// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  BuilderStore,
  createChatPanel,
} from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

describe("UAT FC REQ-37: chat panel surfaces pending tool failures in a dismissable banner", () => {
  it("renders the panel hidden when there are no failures; reveals it when failures land; hides it again on Dismiss", () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const root = document.createElement("div");
    document.body.appendChild(root);
    const panel = createChatPanel(root, {
      store,
      onSend: vi.fn(async () => undefined),
    });

    expect(panel.failurePanel.hidden).toBe(true);

    store.recordToolFailures([
      {
        name: "set_module_content",
        input: { instance_id: "missing", field: "heading", value: "X" },
        error: "no module with id 'missing'",
      },
      {
        name: "add_module",
        input: { page_id: "bad", type: "hero", version: 1 },
        error: "page_id 'bad' not found",
      },
    ]);

    expect(panel.failurePanel.hidden).toBe(false);
    const items = panel.failurePanel.querySelectorAll(
      "[data-fc-chat-failure-tool]",
    );
    expect(items.length).toBe(2);
    expect(items[0].getAttribute("data-fc-chat-failure-tool")).toBe(
      "set_module_content",
    );
    expect(panel.failurePanel.textContent ?? "").toMatch(/no module with id/);

    const dismiss = panel.failurePanel.querySelector(
      "[data-fc-chat-failure-dismiss]",
    ) as HTMLButtonElement;
    expect(dismiss).not.toBeNull();
    dismiss.click();

    expect(panel.failurePanel.hidden).toBe(true);
    expect(store.getState().pendingToolFailures).toEqual([]);

    panel.destroy();
  });
});
