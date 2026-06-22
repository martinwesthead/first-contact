// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { BuilderStore, createChatPanel } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

/**
 * AC-731: a collapsible tool-use pane sits above the message list and shows
 * live tool activity. Header chevron flips ▶ (collapsed default) ↔ ▼; clicking
 * (or Enter/Space) toggles it. appendToolEvent adds a row in dispatch order;
 * the dispatch path auto-expands the pane (expandToolPane); clearToolEvents
 * resets it. Inline ChatCard tool-result renderers in the message list are
 * retained alongside the pane.
 */
describe("UAT AC-731: collapsible tool-use pane above the message list shows live tool events with inline ChatCards retained", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC731_tool_pane_collapsible_and_inline_cards_coexist", () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const panel = createChatPanel(document.body, { store, onSend: async () => {} });

    const chevron = panel.toolHeader.querySelector(
      "[data-fc-chat-tool-chevron]",
    ) as HTMLElement;

    // Collapsed by default with a ▶ chevron; pane lives above the message list.
    expect(panel.toolPane.hidden).toBe(true);
    expect(chevron.textContent).toBe("▶");
    const children = Array.from(panel.root.children);
    expect(children.indexOf(panel.toolHeader)).toBeLessThan(
      children.indexOf(panel.messageList),
    );

    // Click expands (▼); click again collapses (▶).
    panel.toolHeader.click();
    expect(panel.toolPane.hidden).toBe(false);
    expect(chevron.textContent).toBe("▼");
    expect(panel.toolHeader.getAttribute("aria-expanded")).toBe("true");
    panel.toolHeader.click();
    expect(panel.toolPane.hidden).toBe(true);
    expect(chevron.textContent).toBe("▶");

    // Each dispatched tool call appends a row (in order) and the pane is
    // auto-expanded (the live "what the AI is doing now" view).
    panel.appendToolEvent({ name: "set_theme_token", inputSummary: "palette.primary", status: "in_flight" });
    panel.expandToolPane();
    panel.appendToolEvent({ name: "set_module_dial", inputSummary: "hero-1 size", status: "in_flight" });
    const rows = panel.toolPaneBody.querySelectorAll("[data-fc-chat-tool-event]");
    expect(rows).toHaveLength(2);
    expect(rows[0]!.getAttribute("data-fc-chat-tool-event")).toBe("set_theme_token");
    expect(rows[1]!.getAttribute("data-fc-chat-tool-event")).toBe("set_module_dial");
    expect(panel.toolPane.hidden).toBe(false);

    // Reset clears the pane body at the start of each new turn.
    panel.clearToolEvents();
    expect(panel.toolPaneBody.querySelectorAll("[data-fc-chat-tool-event]")).toHaveLength(0);

    // Inline ChatCard result renderers in the message list are retained: a
    // completed tool result on a chat message renders an inline card.
    store.appendChatMessage({
      role: "assistant",
      content: "Applied the change.",
      toolCalls: [
        {
          name: "set_theme_token",
          accepted: true,
          result: {
            ok: true,
            applied: {
              tool: "set_theme_token",
              args: { name: "palette.primary", value: "#ff0099" },
              summary: "set theme token 'palette.primary' to '#ff0099'",
            },
          },
        },
      ],
    });
    const inlineCard = panel.messageList.querySelector("[data-fc-chat-card]");
    expect(inlineCard, "inline ChatCard renders in the message list").not.toBeNull();
  });
});
