// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { BuilderStore, createChatPanel } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

/**
 * REQ-36 G6: the chat panel renders a collapsible tool-use pane above the
 * message list. Hidden by default; clicking the chevron header toggles
 * visible and flips the glyph between ▶ and ▼. The chat-driver feeds it
 * tool-call events via appendToolEvent (wired in main.ts).
 *
 * The pane is additional to the inline ChatCard tool-result renderers in
 * the message list (operator: both, not alternatives — see REQ-36 body).
 */
describe("UAT FC REQ-36: tool-use pane is collapsible and lives above the message list", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("ships the tool-pane DOM in collapsed state with a ▶ chevron, expand toggles to ▼", () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const panel = createChatPanel(document.body, {
      store,
      onSend: async () => {},
    });

    // Default state: header present, pane hidden, chevron ▶.
    expect(panel.toolHeader).not.toBeNull();
    expect(panel.toolPane.hidden).toBe(true);
    const chevron = panel.toolHeader.querySelector(
      "[data-fc-chat-tool-chevron]",
    ) as HTMLElement;
    expect(chevron.textContent).toBe("▶"); // ▶
    expect(panel.toolHeader.getAttribute("aria-expanded")).toBe("false");

    // Click expands.
    panel.toolHeader.click();
    expect(panel.toolPane.hidden).toBe(false);
    expect(chevron.textContent).toBe("▼"); // ▼
    expect(panel.toolHeader.getAttribute("aria-expanded")).toBe("true");

    // Click collapses.
    panel.toolHeader.click();
    expect(panel.toolPane.hidden).toBe(true);
    expect(chevron.textContent).toBe("▶");
  });

  it("appendToolEvent renders a row inside the tool-pane body with the tool name and optional arg summary", () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const panel = createChatPanel(document.body, {
      store,
      onSend: async () => {},
    });

    panel.appendToolEvent({
      name: "set_theme_token",
      inputSummary: "palette.primary",
      status: "in_flight",
    });

    const rows = panel.toolPaneBody.querySelectorAll(
      "[data-fc-chat-tool-event]",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.getAttribute("data-fc-chat-tool-event")).toBe(
      "set_theme_token",
    );
    expect(rows[0]!.getAttribute("data-status")).toBe("in_flight");
    const name = rows[0]!.querySelector(".fc-chat__tool-event-name");
    expect(name!.textContent).toBe("set_theme_token");
    expect(rows[0]!.textContent).toContain("palette.primary");
  });

  it("the pane lives in the DOM ABOVE the message list (XGD layout parity)", () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const panel = createChatPanel(document.body, {
      store,
      onSend: async () => {},
    });
    const children = Array.from(panel.root.children);
    const toolHeaderIndex = children.indexOf(panel.toolHeader);
    const messagesIndex = children.indexOf(panel.messageList);
    expect(toolHeaderIndex).toBeGreaterThanOrEqual(0);
    expect(messagesIndex).toBeGreaterThanOrEqual(0);
    expect(toolHeaderIndex).toBeLessThan(messagesIndex);
  });
});
