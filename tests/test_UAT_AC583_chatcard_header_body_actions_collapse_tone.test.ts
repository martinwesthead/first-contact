// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createChatCard, type ChatCardTone } from "@gendev/builder-ui";

describe("UAT AC-583: ChatCard primitive renders header, body, actions, collapse, and one of five tones", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC583_chatcard_header_body_actions_collapse_and_tone", () => {
    const onApply = vi.fn();
    const onDiscard = vi.fn();
    const onToggle = vi.fn();
    const card = createChatCard(document.body, {
      title: "Reference digest",
      icon: "📄",
      tone: "info",
      body: "Found 3 sources.",
      actions: [
        { label: "Apply", onClick: onApply, variant: "primary" },
        { label: "Discard", onClick: onDiscard },
      ],
      onToggleCollapse: onToggle,
    });

    // Header: leading icon + title.
    const header = card.root.querySelector("[data-fc-chat-card-header]")!;
    expect(header.querySelector("[data-fc-chat-card-title]")?.textContent).toBe(
      "Reference digest",
    );
    expect(header.querySelector("[data-fc-chat-card-icon]")?.textContent).toBe(
      "📄",
    );

    // Body slot.
    const body = card.root.querySelector(
      "[data-fc-chat-card-body]",
    ) as HTMLElement;
    expect(body.textContent).toBe("Found 3 sources.");

    // Actions row: one button per action; click invokes the supplied callback.
    const actionButtons = card.root.querySelectorAll(
      "[data-fc-chat-card-action]",
    );
    expect(actionButtons).toHaveLength(2);
    (actionButtons[0] as HTMLButtonElement).click();
    (actionButtons[1] as HTMLButtonElement).click();
    expect(onApply).toHaveBeenCalledOnce();
    expect(onDiscard).toHaveBeenCalledOnce();

    // Collapse caret hides the body and reports the new collapsed state, then
    // toggling again restores it.
    const caret = card.root.querySelector(
      "[data-fc-chat-card-toggle]",
    ) as HTMLButtonElement;
    expect(card.isCollapsed()).toBe(false);
    caret.click();
    expect(card.isCollapsed()).toBe(true);
    expect(body.style.display).toBe("none");
    expect(onToggle).toHaveBeenLastCalledWith(true);
    caret.click();
    expect(card.isCollapsed()).toBe(false);
    expect(body.style.display).not.toBe("none");
    expect(onToggle).toHaveBeenLastCalledWith(false);

    // Each of the five tones applies exactly one tone accent.
    const tones: ChatCardTone[] = [
      "neutral",
      "info",
      "success",
      "warning",
      "danger",
    ];
    for (const tone of tones) {
      const toned = createChatCard(document.body, { title: "t", tone });
      expect(toned.root.getAttribute("data-fc-chat-card-tone")).toBe(tone);
      const applied = tones.filter((t) =>
        toned.root.classList.contains(`fc-chat-card--${t}`),
      );
      expect(applied).toEqual([tone]);
    }
  });
});
