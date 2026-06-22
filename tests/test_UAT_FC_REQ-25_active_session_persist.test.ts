// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { bootBuilder } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";
import { createMockChatApi } from "./_helpers_REQ-25_chat_api.js";

/**
 * REQ-25 AC2: after a reload, the same chat session is selected (via the
 * localStorage key `fc.builder.activeChatSession.<siteId>`) and its tail
 * loads automatically.
 */
describe("UAT FC REQ-25: active session persists across reload (AC2)", () => {
  it("two reloads of bootBuilder pick up the previously-active session from localStorage", async () => {
    const siteId = "site_REQ-25_persist";
    const mock = createMockChatApi({
      sessions: [
        {
          id: "sess_first",
          site_id: siteId,
          title: "First chat",
          created_at: 100,
          updated_at: 100,
          last_message_at: 100,
          message_count: 0,
        },
        {
          id: "sess_second",
          site_id: siteId,
          title: "Second chat",
          created_at: 200,
          updated_at: 200,
          last_message_at: 200,
          message_count: 0,
        },
      ],
    });
    const storage = new MemoryStorage();

    // Operator picked sess_second last.
    storage.setItem("fc.builder.activeChatSession." + siteId, "sess_second");

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

    // Boot hydration runs async; wait one microtask cycle.
    for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));

    expect(boot.store.getState().activeSessionId).toBe("sess_second");
    boot.destroy();

    // Reboot — same storage, no explicit activeSessionId override; must
    // still pick sess_second.
    const root2 = document.createElement("div");
    document.body.appendChild(root2);
    const reboot = bootBuilder({
      root: root2,
      initialSite: load1stContactSite(),
      siteId,
      storage,
      sessionStorageFacility: null,
      fetch: mock.fetch,
    });
    for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));

    expect(reboot.store.getState().activeSessionId).toBe("sess_second");
    reboot.destroy();
  });
});
