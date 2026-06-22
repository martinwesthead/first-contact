// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { ChatsApi } from "@1stcontact/builder-ui";
import { createMockChatApi } from "./_helpers_REQ-25_chat_api.js";

describe("UAT FC REQ-25: session lists are per-site; site B can't see site A's sessions (AC3)", () => {
  it("two sites with overlapping ids in concept; listSessions returns only the requested site's", async () => {
    const mock = createMockChatApi({
      sessions: [
        {
          id: "sess_a1",
          site_id: "site_A",
          title: "A one",
          created_at: 1,
          updated_at: 2,
          last_message_at: 2,
          message_count: 0,
        },
        {
          id: "sess_a2",
          site_id: "site_A",
          title: "A two",
          created_at: 3,
          updated_at: 4,
          last_message_at: 4,
          message_count: 0,
        },
        {
          id: "sess_b1",
          site_id: "site_B",
          title: "B one",
          created_at: 5,
          updated_at: 6,
          last_message_at: 6,
          message_count: 0,
        },
      ],
    });
    const api = new ChatsApi({ fetch: mock.fetch });

    const aSessions = await api.listSessions("site_A");
    const bSessions = await api.listSessions("site_B");

    expect(aSessions.map((s) => s.id).sort()).toEqual(["sess_a1", "sess_a2"]);
    expect(bSessions.map((s) => s.id)).toEqual(["sess_b1"]);
    // No bleed-through.
    expect(aSessions.some((s) => s.id === "sess_b1")).toBe(false);
    expect(bSessions.some((s) => s.id.startsWith("sess_a"))).toBe(false);
  });
});
