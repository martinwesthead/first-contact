// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { bootBuilder } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";
import { createMockChatApi } from "./_helpers_REQ-25_chat_api.js";

/**
 * REQ-25 (second pass) AC1: there is no "empty state" anymore. On boot the
 * builder auto-creates a chat session if none exists for the site, so the
 * operator can start typing immediately. Subsequent reloads find that
 * session and reuse it (covered by active_session_persist).
 */
describe("UAT FC REQ-25: empty site boots into an auto-created session (AC1)", () => {
  it("siteId with no existing sessions: bootBuilder creates one via POST /api/sites/:siteId/chats and activates it", async () => {
    const siteId = "site_REQ-25_first";
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

    // Hydration is async — wait for the create + tail-load round-trips.
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));

    const activeId = boot.store.getState().activeSessionId;
    expect(activeId).toBeTruthy();
    expect(mock.sessions.has(activeId!)).toBe(true);
    // The active session was created for THIS site.
    expect(mock.sessions.get(activeId!)!.site_id).toBe(siteId);
    // localStorage now points at the new session so a reload re-selects it.
    expect(storage.getItem(`fc.builder.activeChatSession.${siteId}`)).toBe(
      activeId,
    );

    boot.destroy();
  });

  it("siteId with existing sessions: bootBuilder reuses the most recent one — no extra create call", async () => {
    const siteId = "site_REQ-25_reuse";
    const mock = createMockChatApi({
      sessions: [
        {
          id: "sess_existing",
          site_id: siteId,
          title: null,
          created_at: 100,
          updated_at: 200,
          last_message_at: 200,
          message_count: 1,
        },
      ],
    });
    const root = document.createElement("div");
    document.body.appendChild(root);

    const boot = bootBuilder({
      root,
      initialSite: load1stContactSite(),
      siteId,
      storage: new MemoryStorage(),
      sessionStorageFacility: null,
      fetch: mock.fetch,
    });

    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));

    expect(boot.store.getState().activeSessionId).toBe("sess_existing");
    const createCalls = mock.calls.filter(
      (c) => c.method === "POST" && /\/api\/sites\/[^/]+\/chats\/?$/.test(c.url),
    );
    expect(createCalls).toHaveLength(0);

    boot.destroy();
  });
});
