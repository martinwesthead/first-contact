// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  BuilderStore,
  createChatPanel,
} from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

describe("UAT FC REQ-13: assistant markdown renders headers, lists, and code blocks", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("turns markdown headings, lists, and fenced code in an assistant message into <h2>, <ul><li>, and <pre><code> DOM nodes", () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [
        {
          role: "assistant",
          content:
            "## Heading two\n\nI updated three things:\n\n- list item one\n- list item two\n\n```ts\nconst answer = 42;\n```",
        },
      ],
    });

    const panel = createChatPanel(document.body, {
      store,
      onSend: async () => {},
    });

    const messageNode = panel.messageList.querySelector(
      '[data-fc-chat-role="assistant"]',
    );
    expect(messageNode).not.toBeNull();
    expect(messageNode!.querySelector("h2")?.textContent).toBe("Heading two");
    const listItems = messageNode!.querySelectorAll("ul li");
    expect(listItems).toHaveLength(2);
    expect(listItems[0]!.textContent).toBe("list item one");
    expect(listItems[1]!.textContent).toBe("list item two");
    const code = messageNode!.querySelector("pre code");
    expect(code).not.toBeNull();
    expect(code!.textContent).toContain("const answer = 42");
  });
});
