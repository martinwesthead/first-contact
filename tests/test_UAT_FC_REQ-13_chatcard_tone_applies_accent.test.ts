// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createChatCard } from "@1stcontact/builder-ui";

describe("UAT FC REQ-13: <ChatCard> tone applies the accent class", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it.each([
    ["neutral"],
    ["info"],
    ["success"],
    ["warning"],
    ["danger"],
  ] as const)("tone=%s applies fc-chat-card--%s and data-fc-chat-card-tone", (tone) => {
    const card = createChatCard(document.body, { title: "t", tone });
    expect(card.root.classList.contains(`fc-chat-card--${tone}`)).toBe(true);
    expect(card.root.getAttribute("data-fc-chat-card-tone")).toBe(tone);
  });

  it("omitting tone defaults to neutral", () => {
    const card = createChatCard(document.body, { title: "t" });
    expect(card.root.classList.contains("fc-chat-card--neutral")).toBe(true);
    expect(card.root.getAttribute("data-fc-chat-card-tone")).toBe("neutral");
  });
});
