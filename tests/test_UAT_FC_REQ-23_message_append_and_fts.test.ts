import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createReq23TestDb,
  insertMessage,
  insertSession,
  insertSite,
  type D1Like,
} from "./_helpers_REQ-23_db.js";
import type { TestDb } from "./_helpers_REQ-10_db.js";

interface CountRow {
  c: number;
}

interface MatchRow {
  session_id: string;
  ord: number;
  content: string;
}

describe("UAT FC REQ-23: chat_messages append + FTS sync", () => {
  let test: TestDb;
  const db = (): D1Like => test.db as unknown as D1Like;

  beforeAll(async () => {
    test = await createReq23TestDb();
    await insertSite(db(), {
      id: "site_msg",
      account_id: "acct_1stcontact_platform",
      slug: "msg-site",
    });
    await insertSession(db(), { id: "sess_msg_1", site_id: "site_msg" });
  });

  afterAll(async () => {
    await test.cleanup();
  });

  it("inserts a message and finds it via FTS MATCH on the same connection", async () => {
    await insertMessage(db(), {
      id: "msg_001",
      session_id: "sess_msg_1",
      ord: 1,
      role: "user",
      content: "Please make the hero section more cinematic",
    });

    const matches = await db()
      .prepare(
        "SELECT session_id, ord, content FROM chat_messages_fts WHERE chat_messages_fts MATCH ?",
      )
      .bind("cinematic")
      .all<MatchRow>();
    expect(matches.results.length).toBe(1);
    expect(matches.results[0].session_id).toBe("sess_msg_1");
    expect(matches.results[0].ord).toBe(1);
  });

  it("updates FTS index when chat_messages.content is updated", async () => {
    await db()
      .prepare("UPDATE chat_messages SET content = ? WHERE id = ?")
      .bind("Please make the hero section feel oceanic instead", "msg_001")
      .run();

    const cinematic = await db()
      .prepare(
        "SELECT count(*) AS c FROM chat_messages_fts WHERE chat_messages_fts MATCH ?",
      )
      .bind("cinematic")
      .first<CountRow>();
    expect(cinematic?.c).toBe(0);

    const oceanic = await db()
      .prepare(
        "SELECT count(*) AS c FROM chat_messages_fts WHERE chat_messages_fts MATCH ?",
      )
      .bind("oceanic")
      .first<CountRow>();
    expect(oceanic?.c).toBe(1);
  });

  it("removes from FTS when a message row is deleted", async () => {
    await db()
      .prepare("DELETE FROM chat_messages WHERE id = ?")
      .bind("msg_001")
      .run();

    const remaining = await db()
      .prepare(
        "SELECT count(*) AS c FROM chat_messages_fts WHERE chat_messages_fts MATCH ?",
      )
      .bind("oceanic")
      .first<CountRow>();
    expect(remaining?.c).toBe(0);
  });

  it("enforces UNIQUE(session_id, ord)", async () => {
    await insertMessage(db(), {
      id: "msg_dup_a",
      session_id: "sess_msg_1",
      ord: 5,
      role: "user",
      content: "first",
    });
    await expect(
      insertMessage(db(), {
        id: "msg_dup_b",
        session_id: "sess_msg_1",
        ord: 5,
        role: "assistant",
        content: "second",
      }),
    ).rejects.toThrow();
  });

  it("uses idx_chat_messages_session_ord for tail queries", async () => {
    const plan = await db()
      .prepare(
        "EXPLAIN QUERY PLAN SELECT * FROM chat_messages WHERE session_id = ? AND ord < ? ORDER BY ord DESC LIMIT 50",
      )
      .bind("sess_msg_1", 1000)
      .all<{ detail: string }>();
    const detail = plan.results.map((r) => r.detail).join(" | ");
    expect(detail.toLowerCase()).toContain("idx_chat_messages_session_ord");
  });
});
