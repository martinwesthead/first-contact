// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createChatCard } from "@gendev/builder-ui";

describe("UAT FC REQ-13: <ChatCard> renders title in the header, body in the body slot, and action buttons in the actions row", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the title, body, and an actions row whose buttons dispatch their callbacks on click", () => {
    const onPrimary = vi.fn();
    const onSecondary = vi.fn();
    const card = createChatCard(document.body, {
      title: "Reference digest",
      icon: "📄",
      tone: "info",
      body: "Found 3 sources. Apply to site?",
      actions: [
        { label: "Apply", onClick: onPrimary, variant: "primary" },
        { label: "Discard", onClick: onSecondary },
      ],
    });

    // Header content.
    const header = card.root.querySelector("[data-fc-chat-card-header]")!;
    expect(
      header.querySelector("[data-fc-chat-card-title]")?.textContent,
    ).toBe("Reference digest");
    expect(header.querySelector("[data-fc-chat-card-icon]")?.textContent).toBe(
      "📄",
    );

    // Body content.
    const body = card.root.querySelector("[data-fc-chat-card-body]")!;
    expect(body.textContent).toBe("Found 3 sources. Apply to site?");

    // Actions row buttons.
    const actionButtons = card.root.querySelectorAll(
      "[data-fc-chat-card-action]",
    );
    expect(actionButtons).toHaveLength(2);
    expect(actionButtons[0]!.textContent).toBe("Apply");
    expect(actionButtons[1]!.textContent).toBe("Discard");

    (actionButtons[0] as HTMLButtonElement).click();
    (actionButtons[1] as HTMLButtonElement).click();
    expect(onPrimary).toHaveBeenCalledOnce();
    expect(onSecondary).toHaveBeenCalledOnce();
  });
});
