// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  bootBuilder,
  buildFrameworkCatalog,
  BuilderStore,
  ChatsApi,
  runChatTurn,
} from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";

/**
 * AC-818 (BUG-8): the builder's default network client — the one used by
 * chat-session boot, chat sends, and the session HTTP client when no fetch
 * override is supplied — must call the platform global fetch with the global
 * object as its receiver. A real browser's `fetch` is a Window method whose
 * spec requires `this === Window` at call time; capturing the bare reference
 * and calling it later throws:
 *
 *   TypeError: 'fetch' called on an object that does not implement
 *              interface Window.
 *
 * jsdom does not enforce the receiver check, so this UAT installs a strict
 * stand-in `globalThis.fetch` that throws unless invoked with `globalThis`
 * as the receiver, then exercises every default-fetch path with no override
 * and asserts none raise the unbound-fetch TypeError.
 */
describe("UAT AC-818: builder default network client succeeds in a real browser without an unbound-fetch TypeError", () => {
  /** A fetch that throws TypeError when `this !== globalThis`, mimicking the
   *  receiver enforcement Chromium/Firefox apply to Window.fetch. */
  function installStrictFetch(): { restore: () => void; receivers: unknown[] } {
    const receivers: unknown[] = [];
    const original = globalThis.fetch;
    function strictFetch(
      this: unknown,
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      receivers.push(this);
      if (this !== globalThis) {
        throw new TypeError(
          "'fetch' called on an object that does not implement interface Window.",
        );
      }
      const url = typeof input === "string" ? input : String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      // createSession: POST /api/sites/:siteId/chats
      if (method === "POST" && /\/api\/sites\/[^/]+\/chats$/.test(url)) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "sess_uat_ac818",
              title: null,
              last_message_at: 0,
              message_count: 0,
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        );
      }
      // listSessions: GET /api/sites/:siteId/chats
      if (/\/api\/sites\/[^/]+\/chats\/?$/.test(url)) {
        return Promise.resolve(
          new Response(JSON.stringify({ sessions: [] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      }
      // loadTail: GET /api/chats/:id/messages → empty page
      if (/\/api\/chats\/[^/]+\/messages/.test(url)) {
        return Promise.resolve(
          new Response(JSON.stringify({ messages: [] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      }
      // chat turn endpoint: a one-frame SSE so runChatTurn settles.
      if (/\/api\/chat$/.test(url)) {
        const body =
          'event: done\ndata: {"text":"ok","toolCalls":[],"systemActions":null,"intentToken":null}\n\n';
        return Promise.resolve(
          new Response(body, {
            status: 200,
            headers: { "content-type": "text/event-stream" },
          }),
        );
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    }
    Object.defineProperty(globalThis, "fetch", {
      value: strictFetch,
      writable: true,
      configurable: true,
    });
    return {
      restore: () => {
        Object.defineProperty(globalThis, "fetch", {
          value: original,
          writable: true,
          configurable: true,
        });
      },
      receivers,
    };
  }

  it("test_UAT_AC818_default_fetch_paths_invoke_global_fetch_with_global_receiver", async () => {
    const strict = installStrictFetch();
    try {
      // --- Path 1: the session HTTP client (ChatsApi) with no override -------
      const api = new ChatsApi();
      await expect(api.listSessions("site_ac818")).resolves.toBeDefined();

      // --- Path 2: a chat send (runChatTurn) with no override ---------------
      const store = new BuilderStore({
        siteDefinition: load1stContactSite(),
        chatHistory: [],
        activeSessionId: "sess_uat_ac818",
      });
      await runChatTurn("hello", { store, catalog: buildFrameworkCatalog() });
      const history = store.getState().chatHistory;
      const assistant =
        history.findLast?.((m) => m.role === "assistant") ??
        [...history].reverse().find((m) => m.role === "assistant");
      expect(assistant?.content ?? "").not.toMatch(
        /does not implement interface Window/,
      );

      // --- Path 3: chat boot (bootBuilder) with no override -----------------
      const root = document.createElement("div");
      document.body.appendChild(root);
      const boot = bootBuilder({
        root,
        initialSite: load1stContactSite(),
        siteId: "site_ac818",
        storage: new MemoryStorage(),
        sessionStorageFacility: null,
      });
      for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));

      // Boot succeeded — no in-panel system error mentioning the spec error.
      const sysMessages = boot.store
        .getState()
        .chatHistory.filter((m) => m.role === "system");
      for (const m of sysMessages) {
        expect(m.content).not.toMatch(/does not implement interface Window/);
      }
      expect(boot.store.getState().activeSessionId).toBe("sess_uat_ac818");
      boot.destroy();

      // Every recorded fetch receiver across all three paths was globalThis —
      // i.e. the default client bound fetch to the global object.
      expect(strict.receivers.length).toBeGreaterThan(0);
      expect(strict.receivers.every((t) => t === globalThis)).toBe(true);
    } finally {
      strict.restore();
      document.body.innerHTML = "";
    }
  });
});
