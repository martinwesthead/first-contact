// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createChatCard } from "@gendev/builder-ui";

describe("UAT FC REQ-13: <ChatCard> with onToggleCollapse hides/shows the body when the caret is clicked", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("clicking the caret toggles body visibility, fires onToggleCollapse with the new state, and re-renders header-only", () => {
    const onToggle = vi.fn();
    const card = createChatCard(document.body, {
      title: "Reference digest",
      body: "Three sources found.",
      onToggleCollapse: onToggle,
    });

    const body = card.root.querySelector(
      "[data-fc-chat-card-body]",
    ) as HTMLElement;
    const caret = card.root.querySelector(
      "[data-fc-chat-card-toggle]",
    ) as HTMLButtonElement;

    expect(body.style.display).not.toBe("none");
    expect(card.isCollapsed()).toBe(false);

    caret.click();
    expect(card.isCollapsed()).toBe(true);
    expect(body.style.display).toBe("none");
    expect(card.root.getAttribute("data-fc-chat-card-collapsed")).toBe("true");
    expect(onToggle).toHaveBeenLastCalledWith(true);

    caret.click();
    expect(card.isCollapsed()).toBe(false);
    expect(body.style.display).not.toBe("none");
    expect(card.root.getAttribute("data-fc-chat-card-collapsed")).toBe("false");
    expect(onToggle).toHaveBeenLastCalledWith(false);
  });

  it("a card with no onToggleCollapse does not render the caret control", () => {
    const card = createChatCard(document.body, {
      title: "static",
      body: "fixed content",
    });
    expect(card.root.querySelector("[data-fc-chat-card-toggle]")).toBeNull();
  });
});
