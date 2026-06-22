// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  BuilderStore,
  ChatsApi,
  createChatPanel,
} from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { createMockChatApi } from "./_helpers_REQ-25_chat_api.js";

describe("UAT FC REQ-25: deleting the active session clears state and fires DELETE (AC9)", () => {
  it("confirm-prompt true → DELETE sent, store removes the session, active becomes null", async () => {
    const siteId = "site_REQ-25_delete";
    const sessionId = "sess_REQ-25_delete";
    const mock = createMockChatApi({
      sessions: [
        {
          id: sessionId,
          site_id: siteId,
          title: "Doomed",
          created_at: 1,
          updated_at: 2,
          last_message_at: 2,
          message_count: 0,
        },
      ],
    });
    const api = new ChatsApi({ fetch: mock.fetch });

    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello" },
      ],
      activeSessionId: sessionId,
      sessions: [
        {
          id: sessionId,
          title: "Doomed",
          lastMessageAt: 2,
          messageCount: 0,
        },
      ],
    });
    const root = document.createElement("div");
    document.body.appendChild(root);

    const confirmPrompt = vi.fn(() => true);
    const panel = createChatPanel(root, {
      store,
      confirmPrompt,
      onSend: vi.fn(async () => undefined),
      sessionHandlers: {
        onSelectSession: vi.fn(),
        onNewSession: vi.fn(),
        onDeleteSession: async (id) => {
          await api.deleteSession(id);
          store.removeSession(id);
        },
        onRenameSession: vi.fn(),
        onScrollToTop: vi.fn(),
      },
    });

    panel.deleteButton.click();
    await new Promise((r) => setTimeout(r, 0));

    expect(confirmPrompt).toHaveBeenCalled();
    const del = mock.calls.find(
      (c) => c.method === "DELETE" && c.url.includes(`/api/chats/${sessionId}`),
    );
    expect(del).toBeDefined();

    expect(store.getState().sessions).toHaveLength(0);
    expect(store.getState().activeSessionId).toBeNull();
    expect(store.getState().chatHistory).toEqual([]);

    panel.destroy();
  });

  it("confirm-prompt false → no network call, store unchanged", async () => {
    const sessionId = "sess_REQ-25_delete_cancel";
    const mock = createMockChatApi({
      sessions: [
        {
          id: sessionId,
          site_id: "site_x",
          title: "Safe",
          created_at: 1,
          updated_at: 2,
          last_message_at: 2,
          message_count: 0,
        },
      ],
    });

    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
      activeSessionId: sessionId,
      sessions: [
        { id: sessionId, title: "Safe", lastMessageAt: 2, messageCount: 0 },
      ],
    });
    const root = document.createElement("div");
    document.body.appendChild(root);

    const onDelete = vi.fn();
    const panel = createChatPanel(root, {
      store,
      confirmPrompt: () => false,
      onSend: vi.fn(async () => undefined),
      sessionHandlers: {
        onSelectSession: vi.fn(),
        onNewSession: vi.fn(),
        onDeleteSession: onDelete,
        onRenameSession: vi.fn(),
        onScrollToTop: vi.fn(),
      },
    });

    panel.deleteButton.click();
    await new Promise((r) => setTimeout(r, 0));

    expect(onDelete).not.toHaveBeenCalled();
    expect(mock.calls.find((c) => c.method === "DELETE")).toBeUndefined();
    expect(store.getState().activeSessionId).toBe(sessionId);

    panel.destroy();
  });
});
