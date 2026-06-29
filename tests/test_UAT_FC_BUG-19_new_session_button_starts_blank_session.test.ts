// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { bootBuilder } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";
import { createMockChatApi } from "./_helpers_REQ-25_chat_api.js";

/**
 * BUG-19: the builder chat needs a top-of-panel "New session" control so the
 * operator can reset to a blank chat in one click while testing. Starting a
 * new session also mints a fresh per-tab operator session id, which resets the
 * per-session server-side browser-render budget — the control doubles as a
 * budget reset for a session that has exhausted its render allowance.
 *
 * The reset is non-destructive: the prior session is retained in the per-site
 * session list, never deleted.
 */
const SESSION_ID_STORAGE_KEY = "fc.builder.sessionId";

const flush = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));
};

describe("UAT FC BUG-19: New session control starts a fresh blank chat", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders a New session button pinned to the top of the chat panel", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    const boot = bootBuilder({
      root,
      initialSite: load1stContactSite(),
      siteId: "site_BUG-19_render",
      storage: new MemoryStorage(),
      sessionStorageFacility: new MemoryStorage(),
      fetch: createMockChatApi().fetch,
    });

    const header = root.querySelector("[data-fc-chat-header]");
    expect(header).not.toBeNull();
    const button = header!.querySelector("[data-fc-chat-new-session]");
    expect(button).not.toBeNull();
    // It sits above the message list (top of the panel).
    const messages = root.querySelector("[data-fc-chat-messages]");
    expect(
      header!.compareDocumentPosition(messages!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    boot.destroy();
  });

  it("clicking New session creates a fresh blank session, mints a new operator id, and keeps the old session", async () => {
    const siteId = "site_BUG-19_click";
    const mock = createMockChatApi({
      sessions: [
        {
          id: "sess_old",
          site_id: siteId,
          title: null,
          created_at: 100,
          updated_at: 200,
          last_message_at: 200,
          message_count: 1,
        },
      ],
      messages: [
        {
          id: "m1",
          session_id: "sess_old",
          ord: 0,
          role: "user",
          content: "earlier conversation",
          ts: 200,
        },
      ],
    });
    const sessionStorageFacility = new MemoryStorage();
    const root = document.createElement("div");
    document.body.appendChild(root);

    const boot = bootBuilder({
      root,
      initialSite: load1stContactSite(),
      siteId,
      storage: new MemoryStorage(),
      sessionStorageFacility,
      // Explicit initial per-tab id so we can prove the click mints a new one.
      sessionId: "tab-initial",
      fetch: mock.fetch,
    });

    await flush();

    // Precondition: booted into the existing session with its history loaded.
    expect(boot.store.getState().activeSessionId).toBe("sess_old");
    expect(boot.store.getState().chatHistory.length).toBe(1);

    const button = root.querySelector(
      "[data-fc-chat-new-session]",
    ) as HTMLButtonElement;
    button.click();
    await flush();

    const state = boot.store.getState();
    // A different, freshly-created session is now active...
    expect(state.activeSessionId).toBeTruthy();
    expect(state.activeSessionId).not.toBe("sess_old");
    expect(mock.sessions.has(state.activeSessionId!)).toBe(true);
    // ...and the view is blank.
    expect(state.chatHistory.length).toBe(0);

    // The prior session was preserved server-side (non-destructive reset).
    expect(mock.sessions.has("sess_old")).toBe(true);

    // A POST to create the session was issued for THIS site.
    const createCalls = mock.calls.filter(
      (c) => c.method === "POST" && /\/api\/sites\/[^/]+\/chats\/?$/.test(c.url),
    );
    expect(createCalls.length).toBeGreaterThanOrEqual(1);

    // A fresh per-tab operator session id was minted + persisted (resets the
    // per-session server-side browser budget).
    const newOperatorId = sessionStorageFacility.getItem(
      SESSION_ID_STORAGE_KEY,
    );
    expect(newOperatorId).toBeTruthy();
    expect(newOperatorId).not.toBe("tab-initial");

    boot.destroy();
  });
});
