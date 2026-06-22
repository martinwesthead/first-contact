// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { BuilderStore, ChatsApi } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import {
  createMockChatApi,
  type MockMessageRow,
} from "./_helpers_REQ-25_chat_api.js";

describe("UAT FC REQ-25: infinite scroll loads older pages until exhausted (AC5, AC6)", () => {
  it("session with 200 messages: repeated loadBefore prepends pages; hasMoreOlder=false after the oldest is loaded", async () => {
    const siteId = "site_REQ-25_scroll";
    const sessionId = "sess_REQ-25_scroll";
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

    // Tail load: last 50.
    const tail = await api.loadTail(sessionId, 50);
    expect(tail.messages).toHaveLength(50);
    expect(tail.hasMoreOlder).toBe(true);
    const tailOrds = tail.messages.map((m) => m.ord);
    expect(tailOrds[0]).toBe(150);
    expect(tailOrds[tailOrds.length - 1]).toBe(199);
    store.setActiveSession(sessionId, {
      chatHistory: tail.messages.map((m) => m.message),
      loadedFromOrd: tail.messages[0]!.ord,
      hasMoreOlder: tail.hasMoreOlder,
    });

    // Page 2: ord 100..149.
    let state = store.getState();
    let page = await api.loadBefore(sessionId, state.loadedFromOrd!, 50);
    expect(page.messages.map((m) => m.ord)[0]).toBe(100);
    expect(page.hasMoreOlder).toBe(true);
    store.prependOlderMessages(
      page.messages.map((m) => m.message),
      page.messages[0]!.ord,
      page.hasMoreOlder,
    );
    expect(store.getState().chatHistory).toHaveLength(100);

    // Page 3: ord 50..99.
    state = store.getState();
    page = await api.loadBefore(sessionId, state.loadedFromOrd!, 50);
    expect(page.messages.map((m) => m.ord)[0]).toBe(50);
    store.prependOlderMessages(
      page.messages.map((m) => m.message),
      page.messages[0]!.ord,
      page.hasMoreOlder,
    );

    // Page 4: ord 0..49 — fills exactly to the page size; the next load
    // will be empty; the mock returns no rows < 0.
    state = store.getState();
    page = await api.loadBefore(sessionId, state.loadedFromOrd!, 50);
    expect(page.messages.map((m) => m.ord)[0]).toBe(0);
    store.prependOlderMessages(
      page.messages.map((m) => m.message),
      page.messages[0]!.ord,
      page.hasMoreOlder,
    );
    expect(store.getState().chatHistory).toHaveLength(200);

    // Page 5: nothing left.
    state = store.getState();
    page = await api.loadBefore(sessionId, state.loadedFromOrd!, 50);
    expect(page.messages).toHaveLength(0);
    expect(page.hasMoreOlder).toBe(false);
    store.prependOlderMessages([], state.loadedFromOrd!, page.hasMoreOlder);

    // AC6: hasMoreOlder false now; no further requests would be made.
    expect(store.getState().hasMoreOlder).toBe(false);
  });
});
