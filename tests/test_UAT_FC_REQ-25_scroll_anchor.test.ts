// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { BuilderStore, createChatPanel } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

/**
 * REQ-25 AC5: when older messages are prepended via infinite scroll, the
 * previously-topmost visible message must stay under the operator's eye —
 * i.e. scrollTop must compensate for the height delta.
 *
 * jsdom doesn't compute layout, so we patch scrollHeight/scrollTop on the
 * message list to feed deterministic heights into withScrollAnchor's math:
 * the formula is `newScrollTop = newHeight - prevHeight + prevTop`.
 */
describe("UAT FC REQ-25: withScrollAnchor preserves scroll position across prepend (AC5)", () => {
  it("after a prepend that adds 500px of content above the viewport, scrollTop is offset by exactly the height delta", () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [
        { role: "user", content: "current top" },
        { role: "assistant", content: "current bottom" },
      ],
      activeSessionId: "sess_scroll_anchor",
    });
    const root = document.createElement("div");
    document.body.appendChild(root);
    const panel = createChatPanel(root, {
      store,
      onSend: vi.fn(async () => undefined),
    });

    // Pre-mutation: container is 800px tall with scrollTop at 100.
    let fakeHeight = 800;
    let fakeTop = 100;
    Object.defineProperty(panel.messageList, "scrollHeight", {
      configurable: true,
      get: () => fakeHeight,
    });
    Object.defineProperty(panel.messageList, "scrollTop", {
      configurable: true,
      get: () => fakeTop,
      set: (v: number) => {
        fakeTop = v;
      },
    });

    // The mutator grows scrollHeight by 500 (the prepended page's height).
    panel.withScrollAnchor(() => {
      fakeHeight = 1300;
    });

    // Expected: scrollTop should be (1300 - 800 + 100) = 600.
    expect(fakeTop).toBe(600);
    panel.destroy();
  });
});
