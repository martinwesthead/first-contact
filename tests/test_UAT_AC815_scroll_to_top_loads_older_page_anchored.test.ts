// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { BuilderStore, ChatsApi, createChatPanel } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import {
  createMockChatApi,
  type MockMessageRow,
} from "./_helpers_REQ-25_chat_api.js";

/**
 * AC-815 (REQ-25): the builder shows the tail (most-recent messages) of the
 * active session and pages older messages on demand. On scroll-to-top it
 * requests the page immediately preceding the oldest loaded message, prepends
 * those messages, and visually anchors the scroll position so the view does
 * not jump. When no older messages remain it records the log as fully loaded
 * and issues no further older-page requests.
 */
describe("UAT AC-815: scrolling to the top of the chat log loads the next older page with scroll-position anchoring; exhausted sessions stop requesting", () => {
  it("test_UAT_AC815_scroll_to_top_pages_older_with_anchor_and_stops_when_exhausted", async () => {
    const siteId = "site_ac815";
    const sessionId = "sess_ac815";
    const messages: MockMessageRow[] = [];
    for (let i = 0; i < 200; i++) {
      messages.push({
        id: `m_${i}`,
        session_id: sessionId,
        ord: i,
        role: i % 2 === 0 ? "user" : "assistant",
        content: `msg-${i}`,
        ts: 1000 + i,
      });
    }
    const mock = createMockChatApi({
      sessions: [
        {
          id: sessionId,
          site_id: siteId,
          title: "long",
          created_at: 100,
          updated_at: 2000,
          last_message_at: 1199,
          message_count: 200,
        },
      ],
      messages,
    });
    const api = new ChatsApi({ fetch: mock.fetch });
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });

    // --- Boot renders only the tail (last 50), not the whole transcript -----
    const tail = await api.loadTail(sessionId, 50);
    expect(tail.messages).toHaveLength(50);
    expect(tail.hasMoreOlder).toBe(true);
    expect(tail.messages.map((m) => m.ord)[0]).toBe(150);
    store.setActiveSession(sessionId, {
      chatHistory: tail.messages.map((m) => m.message),
      loadedFromOrd: tail.messages[0]!.ord,
      hasMoreOlder: tail.hasMoreOlder,
    });

    // --- Page older runs: each requests the page BEFORE the oldest loaded ---
    const loadOlderPage = async (): Promise<number> => {
      const state = store.getState();
      const page = await api.loadBefore(sessionId, state.loadedFromOrd!, 50);
      const newOrd =
        page.messages.length > 0 ? page.messages[0]!.ord : state.loadedFromOrd!;
      store.prependOlderMessages(
        page.messages.map((m) => m.message),
        newOrd,
        page.hasMoreOlder,
      );
      return page.messages.length;
    };

    // Page 2: ord 100..149 prepended above the tail (oldest now 100).
    const beforeOrd = store.getState().loadedFromOrd!;
    expect(await loadOlderPage()).toBe(50);
    expect(store.getState().loadedFromOrd).toBeLessThan(beforeOrd);
    expect(store.getState().chatHistory).toHaveLength(100);
    // The previously-oldest message is still present (prepend, not replace).
    expect(
      store.getState().chatHistory.some((m) => m.content === "msg-150"),
    ).toBe(true);

    // Pages 3 & 4 drain the rest down to ord 0. Page 4 fills exactly to the
    // page size, so hasMoreOlder is still true (rows.length >= limit) — the
    // server hasn't yet confirmed there is nothing older.
    expect(await loadOlderPage()).toBe(50);
    expect(await loadOlderPage()).toBe(50);
    expect(store.getState().chatHistory).toHaveLength(200);
    expect(store.getState().hasMoreOlder).toBe(true);

    // Page 5 comes back empty → the log is recorded as fully loaded.
    expect(await loadOlderPage()).toBe(0);
    expect(store.getState().chatHistory).toHaveLength(200);
    expect(store.getState().hasMoreOlder).toBe(false);

    // --- Exhausted: a further scroll-to-top issues no older request --------
    const callsBefore = mock.calls.filter((c) =>
      /\/messages\?.*before=/.test(c.url),
    ).length;
    // The boot wiring guards on hasMoreOlder before requesting; emulate that
    // guard: with hasMoreOlder false, no loadBefore is issued.
    if (store.getState().hasMoreOlder) {
      await loadOlderPage();
    }
    const callsAfter = mock.calls.filter((c) =>
      /\/messages\?.*before=/.test(c.url),
    ).length;
    expect(callsAfter).toBe(callsBefore);

    // --- Scroll-position anchoring on prepend (withScrollAnchor math) -------
    // jsdom computes no layout, so feed deterministic geometry: the anchor
    // formula is newScrollTop = newHeight - prevHeight + prevTop.
    const anchorStore = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [
        { role: "user", content: "current top" },
        { role: "assistant", content: "current bottom" },
      ],
      activeSessionId: "sess_ac815_anchor",
    });
    const root = document.createElement("div");
    document.body.appendChild(root);
    const panel = createChatPanel(root, {
      store: anchorStore,
      onSend: vi.fn(async () => undefined),
    });
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
    // Prepending 500px of older content above the viewport...
    panel.withScrollAnchor(() => {
      fakeHeight = 1300;
    });
    // ...offsets scrollTop by exactly the height delta so the view doesn't jump.
    expect(fakeTop).toBe(600);

    panel.destroy();
    document.body.innerHTML = "";
  });
});
