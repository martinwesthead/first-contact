// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  bootBuilder,
  buildFrameworkCatalog,
  runChatTurn,
} from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";
import { createMockChatApi } from "./_helpers_REQ-25_chat_api.js";

/**
 * AC-585 (server-resident, REQ-25): chat-turn history is NOT stored as a
 * transcript in the operator's browser storage. Each turn is persisted into the
 * active session ON THE SERVER (the /api/chat handler appends the user + assistant
 * messages to the session's D1 rows). When the builder is re-mounted — even
 * against a brand-new, empty browser storage — its chat log is restored by
 * loading the active session's tail from the API, preserving message order and
 * content. The only possible source of the restored transcript is the server.
 */
const flushBoot = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));
};

describe("UAT AC-585: chat-turn history is server-resident and restored from the session API tail on builder re-mount", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC585_history_persisted_server_side_and_restored_from_api_tail_on_remount", async () => {
    const siteId = "site_ac585";
    const catalog = buildFrameworkCatalog();
    // One mock chat API shared across both builder mounts — it IS the server,
    // holding sessions and per-session messages across re-mounts.
    const mock = createMockChatApi({ chatResponseText: "Updated." });

    // --- First mount: boot auto-creates and activates exactly one session ----
    const storage1 = new MemoryStorage();
    const root1 = document.createElement("div");
    document.body.appendChild(root1);
    const boot1 = bootBuilder({
      root: root1,
      initialSite: load1stContactSite(),
      siteId,
      storage: storage1,
      sessionStorageFacility: null,
      fetch: mock.fetch,
    });
    await flushBoot();
    const sid = boot1.store.getState().activeSessionId;
    expect(sid).toBeTruthy();

    // Two turns. The /api/chat handler appends the user message + assistant
    // turn to the session on the server (server-resident transcript).
    await runChatTurn("make the primary color pink", {
      store: boot1.store,
      catalog,
      chatSessionId: sid,
      fetch: mock.fetch,
    });
    await runChatTurn("make the hero huge", {
      store: boot1.store,
      catalog,
      chatSessionId: sid,
      fetch: mock.fetch,
    });

    // The server holds the full transcript for this session (4 messages,
    // alternating user/assistant), keyed by the session id.
    const serverMessages = mock.messagesBySession.get(sid!) ?? [];
    expect(serverMessages).toHaveLength(4);
    expect(serverMessages.map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "user",
      "assistant",
    ]);
    expect(serverMessages[0]!.content).toBe("make the primary color pink");
    expect(serverMessages[2]!.content).toBe("make the hero huge");

    boot1.destroy();

    // --- Re-mount against a FRESH, EMPTY browser storage --------------------
    // If history were browser-resident, an empty storage would yield an empty
    // log. The transcript can only come back via the server tail-load.
    const storage2 = new MemoryStorage();
    expect(storage2.getItem("1stcontact_builder_site_v1_chat")).toBeNull();
    const root2 = document.createElement("div");
    document.body.appendChild(root2);
    const boot2 = bootBuilder({
      root: root2,
      initialSite: load1stContactSite(),
      siteId,
      storage: storage2,
      sessionStorageFacility: null,
      fetch: mock.fetch,
    });
    await flushBoot();

    // The same session is reactivated and its tail restored into chatHistory
    // from the API — order and content preserved across the re-mount.
    expect(boot2.store.getState().activeSessionId).toBe(sid);
    const restored = boot2.store.getState().chatHistory;
    expect(restored).toHaveLength(4);
    expect(restored.map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "user",
      "assistant",
    ]);
    expect(restored[0]!.content).toBe("make the primary color pink");
    expect(restored[2]!.content).toBe("make the hero huge");

    // The restore was a genuine server round-trip — a GET on the session
    // messages endpoint — not a browser-storage rehydrate.
    const tailLoads = mock.calls.filter(
      (c) =>
        c.method === "GET" && /\/api\/chats\/[^/]+\/messages/.test(c.url),
    );
    expect(tailLoads.length).toBeGreaterThan(0);

    boot2.destroy();
  });
});
