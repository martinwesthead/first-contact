// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  BuilderStore,
  createChatPanel,
} from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

describe("UAT FC REQ-13: assistant markdown strips inline HTML (no <script> survives sanitisation)", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("an assistant message containing <script> markup does not produce a script tag in the DOM", () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [
        {
          role: "assistant",
          content: "Done — <script>alert(1)</script> see results below.",
        },
      ],
    });

    const panel = createChatPanel(document.body, {
      store,
      onSend: async () => {},
    });
    const message = panel.messageList.querySelector(
      '[data-fc-chat-role="assistant"]',
    )!;
    expect(message.querySelectorAll("script")).toHaveLength(0);
    // DOMPurify also strips on-event handlers from any surviving tags.
    expect(message.innerHTML).not.toContain("onerror=");
    expect(message.innerHTML).not.toContain("onload=");
  });
});
