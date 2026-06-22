// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  BuilderStore,
  ChatsApi,
  createChatPanel,
} from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { createMockChatApi } from "./_helpers_REQ-25_chat_api.js";

describe("UAT FC REQ-25: empty site → New chat creates a session, send persists, reload renders from API (AC1, AC7)", () => {
  it("clicking 'New chat' creates a session via POST /api/sites/:siteId/chats and makes it active; messages persist to the server and reload from the API", async () => {
    const siteId = "site_REQ-25_first";
    const mock = createMockChatApi();
    const chatsApi = new ChatsApi({ fetch: mock.fetch });

    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const root = document.createElement("div");
    document.body.appendChild(root);

    const newSessionCalls: string[] = [];
    const panel = createChatPanel(root, {
      store,
      onSend: vi.fn(async () => undefined),
      sessionHandlers: {
        onSelectSession: vi.fn(),
        onNewSession: async () => {
          const created = await chatsApi.createSession(siteId);
          newSessionCalls.push(created.id);
          store.upsertSession({
            id: created.id,
            title: created.title,
            lastMessageAt: created.lastMessageAt,
            messageCount: created.messageCount,
          });
          store.setActiveSession(created.id, {
            chatHistory: [],
            loadedFromOrd: null,
            hasMoreOlder: false,
          });
        },
        onDeleteSession: vi.fn(),
        onRenameSession: vi.fn(),
        onScrollToTop: vi.fn(),
      },
    });

    // AC1: empty state — no active session, no "Delete" enabled.
    expect(store.getState().activeSessionId).toBeNull();
    expect(panel.deleteButton.disabled).toBe(true);
    expect(panel.newChatButton.textContent).toMatch(/new chat/i);

    panel.newChatButton.click();
    await new Promise((r) => setTimeout(r, 0));

    expect(newSessionCalls).toHaveLength(1);
    expect(store.getState().activeSessionId).toBe(newSessionCalls[0]);
    expect(store.getState().sessions).toHaveLength(1);
    expect(panel.deleteButton.disabled).toBe(false);

    // AC7: persist a message via the API, then a fresh tail-load returns it.
    const sessionId = newSessionCalls[0]!;
    await chatsApi.appendMessage(sessionId, "user", "Hello world");
    const tail = await chatsApi.loadTail(sessionId);
    expect(tail.messages).toHaveLength(1);
    expect(tail.messages[0]!.message.role).toBe("user");
    expect(tail.messages[0]!.message.content).toBe("Hello world");

    panel.destroy();
  });
});
