// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  BuilderStore,
  createChatPanel,
} from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

/**
 * REQ-36 G5: user messages render through the markdown pipeline (mirroring
 * the assistant path) so `**bold**`, headings, lists, code etc. appear
 * formatted in the chat — not as raw markdown source text.
 */
describe("UAT FC REQ-36: user-message markdown renders as formatted HTML in the chat", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders a `# heading`, `**bold**`, and `- list` from a user message as HTML elements", () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    createChatPanel(document.body, {
      store,
      onSend: async () => {},
    });

    store.appendChatMessage({
      role: "user",
      content: "# Heading\n\nSome **bold** text.\n\n- item 1\n- item 2",
    });

    const userMessage = document.querySelector(
      '[data-fc-chat-role="user"]',
    ) as HTMLElement;
    expect(userMessage).not.toBeNull();
    const text = userMessage.querySelector(
      ".fc-chat__message-text",
    ) as HTMLElement;
    expect(text).not.toBeNull();

    // The markdown rendered to real HTML elements rather than raw `# … ** … -`.
    expect(text.querySelector("h1")).not.toBeNull();
    expect(text.querySelector("h1")!.textContent).toBe("Heading");
    expect(text.querySelector("strong")).not.toBeNull();
    expect(text.querySelector("strong")!.textContent).toBe("bold");
    const items = text.querySelectorAll("ul li");
    expect(items).toHaveLength(2);
    expect(items[0]!.textContent).toBe("item 1");

    // The plain `#` literal should be gone — that is the regression we are
    // guarding against (textContent rendering raw markdown source).
    expect(text.textContent).not.toContain("#");
    expect(text.textContent).not.toContain("**");
  });

  it("assistant messages still render markdown (REQ-13 behaviour preserved)", () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    createChatPanel(document.body, {
      store,
      onSend: async () => {},
    });

    store.appendChatMessage({
      role: "assistant",
      content: "## Done\n\nApplied **palette.primary** = #ff0099.",
    });

    const text = document.querySelector(
      '[data-fc-chat-role="assistant"] .fc-chat__message-text',
    ) as HTMLElement;
    expect(text).not.toBeNull();
    expect(text.querySelector("h2")).not.toBeNull();
    expect(text.querySelector("strong")).not.toBeNull();
  });
});
