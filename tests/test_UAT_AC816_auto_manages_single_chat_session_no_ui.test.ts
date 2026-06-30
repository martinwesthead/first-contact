// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { bootBuilder } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";
import { createMockChatApi } from "./_helpers_REQ-25_chat_api.js";

/**
 * AC-816 (REQ-25): the builder auto-manages exactly one chat session per
 * (site, browser). On boot it activates a session by precedence:
 *   1. the active id stored in browser storage for this site, if it still
 *      exists on the server;
 *   2. otherwise the most-recently-used session for the site;
 *   3. otherwise a freshly created session.
 * A session always exists after boot (no "no active session" empty state),
 * the chosen session persists across reloads, and the panel exposes NO
 * session-list / new-chat / inline-title-edit / delete affordances in v1.
 */
const flushBoot = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));
};

const STORE_KEY = (siteId: string): string =>
  `fc.builder.activeChatSession.${siteId}`;

describe("UAT AC-816: builder auto-manages a single chat session per (site, browser) with no session-management UI", () => {
  it("test_UAT_AC816_boot_activates_one_session_by_precedence_and_exposes_no_session_ui", async () => {
    // --- Case 1: no existing sessions → exactly one is created & activated ---
    {
      const siteId = "site_ac816_fresh";
      const mock = createMockChatApi();
      const storage = new MemoryStorage();
      const root = document.createElement("div");
      document.body.appendChild(root);
      const boot = bootBuilder({
        root,
        initialSite: load1stContactSite(),
        siteId,
        storage,
        sessionStorageFacility: null,
        fetch: mock.fetch,
      });
      await flushBoot();

      const activeId = boot.store.getState().activeSessionId;
      expect(activeId).toBeTruthy(); // never a "no active session" empty state
      // Exactly one session exists for this site and it is the active one.
      const forSite = Array.from(mock.sessions.values()).filter(
        (s) => s.site_id === siteId,
      );
      expect(forSite).toHaveLength(1);
      expect(forSite[0]!.id).toBe(activeId);
      // Persisted to browser storage keyed by site so a reload re-selects it.
      expect(storage.getItem(STORE_KEY(siteId))).toBe(activeId);

      // --- No session-management UI is rendered in the panel ---------------
      const buttons = Array.from(root.querySelectorAll("button"));
      const sessionUi = buttons.filter((b) =>
        /new chat|new session|delete|rename|sessions?\b/i.test(
          b.textContent ?? "",
        ),
      );
      expect(sessionUi).toHaveLength(0);
      // No session-list/new/delete data hooks exist either.
      expect(
        root.querySelector(
          "[data-fc-chat-session-list],[data-fc-chat-new-session],[data-fc-chat-session-delete],[data-fc-chat-session-rename]",
        ),
      ).toBeNull();

      boot.destroy();
    }

    // --- Case 2: stored active id that still exists → it is reactivated -----
    {
      const siteId = "site_ac816_stored";
      const mock = createMockChatApi({
        sessions: [
          {
            id: "sess_old",
            site_id: siteId,
            title: "old",
            created_at: 100,
            updated_at: 100,
            last_message_at: 100,
            message_count: 0,
          },
          {
            id: "sess_new",
            site_id: siteId,
            title: "new",
            created_at: 300,
            updated_at: 300,
            last_message_at: 300,
            message_count: 0,
          },
        ],
      });
      const storage = new MemoryStorage();
      // Operator's stored choice is the OLDER session — precedence (1) must
      // win over most-recently-used (which would be sess_new).
      storage.setItem(STORE_KEY(siteId), "sess_old");
      const root = document.createElement("div");
      document.body.appendChild(root);
      const boot = bootBuilder({
        root,
        initialSite: load1stContactSite(),
        siteId,
        storage,
        sessionStorageFacility: null,
        fetch: mock.fetch,
      });
      await flushBoot();

      expect(boot.store.getState().activeSessionId).toBe("sess_old");
      // No new session was created — it reused the stored one.
      const createCalls = mock.calls.filter(
        (c) =>
          c.method === "POST" && /\/api\/sites\/[^/]+\/chats\/?$/.test(c.url),
      );
      expect(createCalls).toHaveLength(0);
      boot.destroy();
    }

    // --- Case 3: stored id absent, other sessions present → most-recent -----
    {
      const siteId = "site_ac816_mru";
      const mock = createMockChatApi({
        sessions: [
          {
            id: "sess_a",
            site_id: siteId,
            title: "a",
            created_at: 100,
            updated_at: 100,
            last_message_at: 100,
            message_count: 0,
          },
          {
            id: "sess_b_recent",
            site_id: siteId,
            title: "b",
            created_at: 200,
            updated_at: 500,
            last_message_at: 500,
            message_count: 0,
          },
        ],
      });
      const storage = new MemoryStorage(); // nothing stored
      const root = document.createElement("div");
      document.body.appendChild(root);
      const boot = bootBuilder({
        root,
        initialSite: load1stContactSite(),
        siteId,
        storage,
        sessionStorageFacility: null,
        fetch: mock.fetch,
      });
      await flushBoot();

      // Most-recently-used (highest last_message_at) is activated.
      expect(boot.store.getState().activeSessionId).toBe("sess_b_recent");
      const createCalls = mock.calls.filter(
        (c) =>
          c.method === "POST" && /\/api\/sites\/[^/]+\/chats\/?$/.test(c.url),
      );
      expect(createCalls).toHaveLength(0);
      boot.destroy();
    }

    document.body.innerHTML = "";
  });
});
