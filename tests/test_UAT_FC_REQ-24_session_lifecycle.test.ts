import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handleChatRoute } from "../apps/control-app/src/chat-routes.js";
import { createReq23TestDb, insertSite, type D1Like } from "./_helpers_REQ-23_db.js";
import type { TestDb } from "./_helpers_REQ-10_db.js";

describe("UAT FC REQ-24: session HTTP lifecycle (create, list, append, paginate, delete cascade)", () => {
  let test: TestDb;
  const db = (): D1Like => test.db as unknown as D1Like;
  const env = (): { SITES_DB: D1Like } => ({ SITES_DB: db() });

  const siteId = "site_lifecycle";

  beforeAll(async () => {
    test = await createReq23TestDb();
    await insertSite(db(), {
      id: siteId,
      account_id: "acct_1stcontact_platform",
      slug: "lifecycle",
    });
  });

  afterAll(async () => {
    await test.cleanup();
  });

  it("AC1+AC2+AC3+AC4: full session lifecycle — create, list, append messages with monotonic ord, paginate tail and before, delete cascades", async () => {
    // AC1 — POST /api/sites/:siteId/chats returns an id; session is visible in the list.
    const createRes = await handleChatRoute(
      new Request(`https://app/api/sites/${siteId}/chats`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Test session" }),
      }),
      env(),
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string; site_id: string };
    expect(created.id).toMatch(/^sess_/);
    expect(created.site_id).toBe(siteId);
    const sessionId = created.id;

    // AC2 — append 5 messages, ord should be 0..4 contiguously.
    for (let i = 0; i < 5; i++) {
      const r = await handleChatRoute(
        new Request(`https://app/api/chats/${sessionId}/messages`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ role: "user", content: `m${i}` }),
        }),
        env(),
      );
      expect(r.status).toBe(201);
      const j = (await r.json()) as { ord: number };
      expect(j.ord).toBe(i);
    }

    // AC3 — GET tail (no `before`) returns messages in ord ascending.
    const tailRes = await handleChatRoute(
      new Request(`https://app/api/chats/${sessionId}/messages`),
      env(),
    );
    const tailBody = (await tailRes.json()) as {
      messages: Array<{ ord: number; content: string }>;
    };
    expect(tailBody.messages.map((m) => m.ord)).toEqual([0, 1, 2, 3, 4]);

    // AC4 — GET with before=N&limit=2 returns the 2 messages with ord<N ascending.
    const pagedRes = await handleChatRoute(
      new Request(`https://app/api/chats/${sessionId}/messages?before=4&limit=2`),
      env(),
    );
    const pagedBody = (await pagedRes.json()) as {
      messages: Array<{ ord: number }>;
    };
    expect(pagedBody.messages.map((m) => m.ord)).toEqual([2, 3]);

    // Session denorms updated: last_message_at set, message_count=5.
    const listRes = await handleChatRoute(
      new Request(`https://app/api/sites/${siteId}/chats`),
      env(),
    );
    const list = (await listRes.json()) as {
      sessions: Array<{ id: string; message_count: number; last_message_at: number | null }>;
    };
    const seen = list.sessions.find((s) => s.id === sessionId);
    expect(seen).toBeDefined();
    expect(seen?.message_count).toBe(5);
    expect(seen?.last_message_at).not.toBeNull();

    // PATCH renames the title.
    const patchRes = await handleChatRoute(
      new Request(`https://app/api/chats/${sessionId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Renamed" }),
      }),
      env(),
    );
    expect(patchRes.status).toBe(200);
    const renamed = (await patchRes.json()) as { title: string };
    expect(renamed.title).toBe("Renamed");

    // DELETE cascades messages + removes from FTS.
    const deleteRes = await handleChatRoute(
      new Request(`https://app/api/chats/${sessionId}`, { method: "DELETE" }),
      env(),
    );
    expect(deleteRes.status).toBe(200);
    const remaining = await db()
      .prepare("SELECT COUNT(*) AS n FROM chat_messages WHERE session_id = ?")
      .bind(sessionId)
      .first<{ n: number }>();
    expect(remaining?.n).toBe(0);
    const ftsAfter = await db()
      .prepare("SELECT COUNT(*) AS n FROM chat_messages_fts WHERE session_id = ?")
      .bind(sessionId)
      .first<{ n: number }>();
    expect(ftsAfter?.n).toBe(0);
  });
});
