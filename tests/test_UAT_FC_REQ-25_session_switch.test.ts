// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  BuilderStore,
  ChatsApi,
  createChatPanel,
} from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { createMockChatApi } from "./_helpers_REQ-25_chat_api.js";

describe("UAT FC REQ-25: switching sessions loads each session's own tail (AC4, AC10)", () => {
  it("two seeded sessions; selecting one then the other shows each session's distinct messages", async () => {
    const siteId = "site_REQ-25_switch";
    const mock = createMockChatApi({
      sessions: [
        {
          id: "sess_alpha",
          site_id: siteId,
          title: "Alpha discussion",
          created_at: 100,
          updated_at: 200,
          last_message_at: 200,
          message_count: 2,
        },
        {
          id: "sess_beta",
          site_id: siteId,
          title: "Beta planning",
          created_at: 150,
          updated_at: 300,
          last_message_at: 300,
          message_count: 2,
        },
      ],
      messages: [
        {
          id: "m_a1",
          session_id: "sess_alpha",
          ord: 0,
          role: "user",
          content: "alpha question",
          ts: 100,
        },
        {
          id: "m_a2",
          session_id: "sess_alpha",
          ord: 1,
          role: "assistant",
          content: "alpha answer",
          ts: 110,
        },
        {
          id: "m_b1",
          session_id: "sess_beta",
          ord: 0,
          role: "user",
          content: "beta question",
          ts: 200,
        },
        {
          id: "m_b2",
          session_id: "sess_beta",
          ord: 1,
          role: "assistant",
          content: "beta answer",
          ts: 210,
        },
      ],
    });
    const chatsApi = new ChatsApi({ fetch: mock.fetch });

    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const root = document.createElement("div");
    document.body.appendChild(root);

    // Hydrate sessions into the store.
    const sessions = await chatsApi.listSessions(siteId);
    store.setSessions(
      sessions.map((s) => ({
        id: s.id,
        title: s.title,
        lastMessageAt: s.lastMessageAt,
        messageCount: s.messageCount,
      })),
    );

    const panel = createChatPanel(root, {
      store,
      onSend: vi.fn(async () => undefined),
      sessionHandlers: {
        onSelectSession: async (id) => {
          const tail = await chatsApi.loadTail(id);
          store.setActiveSession(id, {
            chatHistory: tail.messages.map((m) => m.message),
            loadedFromOrd:
              tail.messages.length > 0 ? tail.messages[0]!.ord : null,
            hasMoreOlder: tail.hasMoreOlder,
          });
        },
        onNewSession: vi.fn(),
        onDeleteSession: vi.fn(),
        onRenameSession: vi.fn(),
        onScrollToTop: vi.fn(),
      },
    });

    // Both sessions appear in the dropdown.
    const options = Array.from(panel.sessionSelect.options).map((o) => o.value);
    expect(options).toContain("sess_alpha");
    expect(options).toContain("sess_beta");

    // Select alpha and verify its tail loads.
    panel.sessionSelect.value = "sess_alpha";
    panel.sessionSelect.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 0));
    let messages = store.getState().chatHistory;
    expect(messages.map((m) => m.content)).toEqual([
      "alpha question",
      "alpha answer",
    ]);

    // Switch to beta — alpha's messages must be replaced, not appended.
    panel.sessionSelect.value = "sess_beta";
    panel.sessionSelect.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 0));
    messages = store.getState().chatHistory;
    expect(messages.map((m) => m.content)).toEqual([
      "beta question",
      "beta answer",
    ]);

    panel.destroy();
  });
});
