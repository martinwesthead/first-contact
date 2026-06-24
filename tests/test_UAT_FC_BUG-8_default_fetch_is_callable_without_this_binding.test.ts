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
 * BUG-8: the three call sites that default `fetch` to `globalThis.fetch` must
 * bind the receiver. The browser's `fetch` is defined as a method of the
 * Window interface and the spec requires `this === Window` at call time —
 * calling the bare reference (whether as a free function `fetchImpl(...)`
 * or as an instance field `this.fetchImpl(...)`) throws:
 *
 *   TypeError: 'fetch' called on an object that does not implement
 *              interface Window.
 *
 * jsdom does not enforce this by itself, so the UAT installs a stand-in
 * `globalThis.fetch` that performs the receiver check the spec mandates.
 */
describe("UAT FC BUG-8: default fetch must be bound to globalThis", () => {
  /** Construct a fetch that throws TypeError when `this !== globalThis`,
   *  mimicking what Chromium/Firefox do at runtime. */
  function installStrictFetch(): { restore: () => void; calls: unknown[] } {
    const calls: unknown[] = [];
    const original = globalThis.fetch;
    function strictFetch(
      this: unknown,
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      calls.push(this);
      if (this !== globalThis) {
        throw new TypeError(
          "'fetch' called on an object that does not implement interface Window.",
        );
      }
      const url = typeof input === "string" ? input : String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      // POST /api/sites/:siteId/chats → createSession
      if (method === "POST" && /\/api\/sites\/[^/]+\/chats$/.test(url)) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "sess_uat_bug8",
              title: null,
              last_message_at: 0,
              message_count: 0,
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        );
      }
      // GET /api/sites/:siteId/chats → listSessions
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
      // chat turn endpoint: respond with a one-frame SSE so runChatTurn finishes.
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
      calls,
    };
  }

  it("AC1: ChatsApi.listSessions with no fetch override does not throw the unbound-fetch TypeError", async () => {
    const strict = installStrictFetch();
    try {
      const api = new ChatsApi();
      await expect(api.listSessions("site_bug8")).resolves.toBeDefined();
      // Every recorded receiver must be globalThis.
      expect(strict.calls.every((t) => t === globalThis)).toBe(true);
    } finally {
      strict.restore();
    }
  });

  it("AC2: runChatTurn with no fetch override does not surface the unbound-fetch TypeError", async () => {
    const strict = installStrictFetch();
    try {
      const store = new BuilderStore({
        siteDefinition: load1stContactSite(),
        chatHistory: [],
        activeSessionId: "sess_uat_bug8",
      });
      const catalog = buildFrameworkCatalog();
      await runChatTurn("hello", { store, catalog });
      // The assistant bubble must not carry the spec-error text.
      const history = store.getState().chatHistory;
      const assistant = history.findLast?.((m) => m.role === "assistant")
        ?? [...history].reverse().find((m) => m.role === "assistant");
      expect(assistant?.content ?? "").not.toMatch(
        /does not implement interface Window/,
      );
      expect(strict.calls.every((t) => t === globalThis)).toBe(true);
    } finally {
      strict.restore();
    }
  });

  it("AC3: bootBuilder with no fetch override does not surface the unbound-fetch TypeError in the in-panel system message", async () => {
    const strict = installStrictFetch();
    try {
      const root = document.createElement("div");
      document.body.appendChild(root);
      const boot = bootBuilder({
        root,
        initialSite: load1stContactSite(),
        siteId: "site_bug8",
        storage: new MemoryStorage(),
        sessionStorageFacility: null,
      });
      for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));

      const messages = boot.store.getState().chatHistory;
      const sysErr = messages.find((m) => m.role === "system");
      // If a system message was appended, it must NOT be the spec error.
      expect(sysErr?.content ?? "").not.toMatch(
        /does not implement interface Window/,
      );
      // Boot succeeded → activeSessionId is set.
      expect(boot.store.getState().activeSessionId).toBe("sess_uat_bug8");
      expect(strict.calls.every((t) => t === globalThis)).toBe(true);

      boot.destroy();
    } finally {
      strict.restore();
    }
  });
});
