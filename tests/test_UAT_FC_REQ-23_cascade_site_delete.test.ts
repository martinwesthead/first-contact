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

describe("UAT FC REQ-23: cascade delete from sites → sessions → messages → FTS", () => {
  let test: TestDb;
  const db = (): D1Like => test.db as unknown as D1Like;

  beforeAll(async () => {
    test = await createReq23TestDb();
    await db().prepare("PRAGMA foreign_keys = ON").run();

    await insertSite(db(), {
      id: "site_cascade",
      account_id: "acct_1stcontact_platform",
      slug: "cascade-site",
    });
    await insertSession(db(), { id: "sess_cascade", site_id: "site_cascade" });
    await insertMessage(db(), {
      id: "msg_cascade_1",
      session_id: "sess_cascade",
      ord: 1,
      role: "user",
      content: "cascadealpha",
    });
    await insertMessage(db(), {
      id: "msg_cascade_2",
      session_id: "sess_cascade",
      ord: 2,
      role: "assistant",
      content: "cascadebeta",
    });
  });

  afterAll(async () => {
    await test.cleanup();
  });

  it("starts with one session and two messages", async () => {
    const sessions = await db()
      .prepare("SELECT count(*) AS c FROM chat_sessions WHERE site_id = ?")
      .bind("site_cascade")
      .first<CountRow>();
    expect(sessions?.c).toBe(1);
    const messages = await db()
      .prepare("SELECT count(*) AS c FROM chat_messages WHERE session_id = ?")
      .bind("sess_cascade")
      .first<CountRow>();
    expect(messages?.c).toBe(2);
    const fts = await db()
      .prepare(
        "SELECT count(*) AS c FROM chat_messages_fts WHERE chat_messages_fts MATCH ?",
      )
      .bind("cascadealpha")
      .first<CountRow>();
    expect(fts?.c).toBe(1);
  });

  it("deleting the site cascades to chat_sessions and chat_messages, and keeps FTS consistent", async () => {
    await db()
      .prepare("DELETE FROM sites WHERE id = ?")
      .bind("site_cascade")
      .run();

    const sessions = await db()
      .prepare("SELECT count(*) AS c FROM chat_sessions WHERE site_id = ?")
      .bind("site_cascade")
      .first<CountRow>();
    expect(sessions?.c).toBe(0);

    const messages = await db()
      .prepare("SELECT count(*) AS c FROM chat_messages WHERE session_id = ?")
      .bind("sess_cascade")
      .first<CountRow>();
    expect(messages?.c).toBe(0);

    const ftsAlpha = await db()
      .prepare(
        "SELECT count(*) AS c FROM chat_messages_fts WHERE chat_messages_fts MATCH ?",
      )
      .bind("cascadealpha")
      .first<CountRow>();
    expect(ftsAlpha?.c).toBe(0);
    const ftsBeta = await db()
      .prepare(
        "SELECT count(*) AS c FROM chat_messages_fts WHERE chat_messages_fts MATCH ?",
      )
      .bind("cascadebeta")
      .first<CountRow>();
    expect(ftsBeta?.c).toBe(0);
  });

  it("deleting only the session also cascades to its messages and FTS", async () => {
    await insertSite(db(), {
      id: "site_cascade2",
      account_id: "acct_1stcontact_platform",
      slug: "cascade-site-2",
    });
    await insertSession(db(), { id: "sess_cascade2", site_id: "site_cascade2" });
    await insertMessage(db(), {
      id: "msg_cascade2_1",
      session_id: "sess_cascade2",
      ord: 1,
      role: "user",
      content: "cascadegamma",
    });

    await db()
      .prepare("DELETE FROM chat_sessions WHERE id = ?")
      .bind("sess_cascade2")
      .run();

    const messages = await db()
      .prepare("SELECT count(*) AS c FROM chat_messages WHERE session_id = ?")
      .bind("sess_cascade2")
      .first<CountRow>();
    expect(messages?.c).toBe(0);

    const fts = await db()
      .prepare(
        "SELECT count(*) AS c FROM chat_messages_fts WHERE chat_messages_fts MATCH ?",
      )
      .bind("cascadegamma")
      .first<CountRow>();
    expect(fts?.c).toBe(0);
  });
});
