// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { BuilderStore, createChatPanel } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

describe("UAT AC-581: assistant messages render as sanitized markdown; user and system messages stay plaintext", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC581_assistant_markdown_sanitized_user_plaintext", () => {
    const userMarkdown = "## not a heading\n\n- not a list";
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [
        {
          role: "assistant",
          content:
            "## Heading\n\n- list item\n\n```ts\nconst x = 1;\n```\n\n" +
            "[docs](https://example.com)\n\n" +
            '<script>alert(1)</script>\n<img src=x onerror="alert(2)">',
        },
        { role: "user", content: userMarkdown },
      ],
    });

    const panel = createChatPanel(document.body, { store, onSend: async () => {} });

    const assistant = panel.messageList.querySelector(
      '[data-fc-chat-role="assistant"]',
    )!;
    // Markdown structures become their corresponding DOM elements.
    expect(assistant.querySelector("h2")?.textContent).toBe("Heading");
    expect(assistant.querySelectorAll("ul li")).toHaveLength(1);
    expect(assistant.querySelector("pre code")).not.toBeNull();

    // Links open in a new tab with the noopener/noreferrer guard.
    const anchor = assistant.querySelector("a")!;
    expect(anchor.getAttribute("target")).toBe("_blank");
    expect(anchor.getAttribute("rel")).toContain("noopener");
    expect(anchor.getAttribute("rel")).toContain("noreferrer");

    // Injected raw HTML is sanitized: no <script>, no on*= event handlers.
    expect(assistant.querySelectorAll("script")).toHaveLength(0);
    expect(assistant.innerHTML).not.toContain("onerror=");
    expect(assistant.innerHTML).not.toContain("onload=");

    // User-role messages are NOT markdown-rendered — verbatim plaintext.
    const user = panel.messageList.querySelector('[data-fc-chat-role="user"]')!;
    expect(user.querySelector("h2")).toBeNull();
    expect(user.querySelector("li")).toBeNull();
    expect(user.textContent).toContain(userMarkdown);
  });
});
