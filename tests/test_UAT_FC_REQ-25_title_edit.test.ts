// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  BuilderStore,
  ChatsApi,
  createChatPanel,
} from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { createMockChatApi } from "./_helpers_REQ-25_chat_api.js";

describe("UAT FC REQ-25: title edit fires PATCH /api/chats/:id and the new title appears in the dropdown (AC8)", () => {
  it("click → edit → blur sends PATCH; store is updated", async () => {
    const siteId = "site_REQ-25_title";
    const sessionId = "sess_REQ-25_title";
    const mock = createMockChatApi({
      sessions: [
        {
          id: sessionId,
          site_id: siteId,
          title: "Original title",
          created_at: 100,
          updated_at: 100,
          last_message_at: 100,
          message_count: 0,
        },
      ],
    });
    const chatsApi = new ChatsApi({ fetch: mock.fetch });

    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
      activeSessionId: sessionId,
      sessions: [
        {
          id: sessionId,
          title: "Original title",
          lastMessageAt: 100,
          messageCount: 0,
        },
      ],
    });
    const root = document.createElement("div");
    document.body.appendChild(root);

    const panel = createChatPanel(root, {
      store,
      onSend: vi.fn(async () => undefined),
      sessionHandlers: {
        onSelectSession: vi.fn(),
        onNewSession: vi.fn(),
        onDeleteSession: vi.fn(),
        onRenameSession: async (id, title) => {
          const updated = await chatsApi.patchSessionTitle(id, title);
          store.upsertSession({
            id: updated.id,
            title: updated.title,
            lastMessageAt: updated.lastMessageAt,
            messageCount: updated.messageCount,
          });
        },
        onScrollToTop: vi.fn(),
      },
    });

    // Title editor renders the current title.
    expect(panel.titleEditor.textContent).toBe("Original title");

    // Click → contenteditable enabled.
    panel.titleEditor.click();
    expect(panel.titleEditor.getAttribute("contenteditable")).toBe("true");

    // Set new text and blur.
    panel.titleEditor.textContent = "Renamed session";
    panel.titleEditor.dispatchEvent(new FocusEvent("blur"));
    await new Promise((r) => setTimeout(r, 0));

    expect(panel.titleEditor.getAttribute("contenteditable")).toBe("false");

    // PATCH was sent.
    const patchCall = mock.calls.find(
      (c) => c.method === "PATCH" && c.url.includes(`/api/chats/${sessionId}`),
    );
    expect(patchCall).toBeDefined();
    expect(JSON.parse(patchCall!.body).title).toBe("Renamed session");

    // Store reflects the new title.
    const sess = store.getState().sessions.find((s) => s.id === sessionId);
    expect(sess?.title).toBe("Renamed session");
    expect(panel.titleEditor.textContent).toBe("Renamed session");

    panel.destroy();
  });
});
