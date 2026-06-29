// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { BuilderStore, createChatPanel } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

/**
 * AC-581 (widened by REQ-36): BOTH assistant and user chat messages render
 * as sanitized markdown (headers/lists/fenced code → DOM elements; links open
 * in a new tab with rel noopener noreferrer; injected <script> and on*=
 * handlers are stripped). Only system-role messages stay verbatim plaintext.
 */
describe("UAT AC-581: assistant and user messages render as sanitized markdown; system messages stay plaintext", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC581_assistant_and_user_markdown_sanitized_system_plaintext", () => {
    const systemMarkdown = "## not a heading\n\n- not a list";
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
        { role: "user", content: "# Title\n\nSome **bold** text." },
        { role: "system", content: systemMarkdown },
      ],
    });

    const panel = createChatPanel(document.body, { store, onSend: async () => {} });

    // --- Assistant: markdown structures become DOM elements ---------------
    const assistant = panel.messageList.querySelector(
      '[data-fc-chat-role="assistant"]',
    )!;
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

    // --- User: markdown ALSO renders formatted (REQ-36 widening) ----------
    const user = panel.messageList.querySelector('[data-fc-chat-role="user"]')!;
    expect(user.querySelector("h1")?.textContent).toBe("Title");
    expect(user.querySelector("strong")?.textContent).toBe("bold");
    // The literal markdown punctuation is gone — it rendered, not echoed.
    expect(user.textContent).not.toContain("**");
    expect(user.querySelector(".fc-chat__message-text")!.textContent).not.toContain(
      "# Title",
    );

    // --- System: NOT markdown-rendered — verbatim plaintext ---------------
    const system = panel.messageList.querySelector('[data-fc-chat-role="system"]')!;
    expect(system.querySelector("h2")).toBeNull();
    expect(system.querySelector("li")).toBeNull();
    expect(system.textContent).toContain(systemMarkdown);
  });
});
