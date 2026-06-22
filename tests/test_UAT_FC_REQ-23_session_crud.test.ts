import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createReq23TestDb,
  insertSession,
  insertSite,
  type D1Like,
} from "./_helpers_REQ-23_db.js";
import type { TestDb } from "./_helpers_REQ-10_db.js";

interface NameRow {
  name: string;
}

interface SessionRow {
  id: string;
  site_id: string;
  user_id: string | null;
  title: string | null;
  message_count: number;
}

describe("UAT FC REQ-23: chat_sessions CRUD + per-site cascade index", () => {
  let test: TestDb;
  const db = (): D1Like => test.db as unknown as D1Like;

  beforeAll(async () => {
    test = await createReq23TestDb();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  it("creates the chat_sessions table and its index after migrations apply", async () => {
    const tables = await db()
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='chat_sessions'",
      )
      .all<NameRow>();
    expect(tables.results.length).toBe(1);

    const indexes = await db()
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_chat_sessions_site_last'",
      )
      .all<NameRow>();
    expect(indexes.results.length).toBe(1);
  });

  it("inserts a chat_session bound to a site and round-trips its fields", async () => {
    await insertSite(db(), {
      id: "site_crud_A",
      account_id: "acct_1stcontact_platform",
      slug: "crud-site-a",
    });
    await insertSession(db(), {
      id: "sess_crud_1",
      site_id: "site_crud_A",
      user_id: null,
      title: "First session",
    });

    const row = await db()
      .prepare(
        "SELECT id, site_id, user_id, title, message_count FROM chat_sessions WHERE id = ?",
      )
      .bind("sess_crud_1")
      .first<SessionRow>();
    expect(row).not.toBeNull();
    expect(row?.site_id).toBe("site_crud_A");
    expect(row?.user_id).toBeNull();
    expect(row?.title).toBe("First session");
    expect(row?.message_count).toBe(0);
  });

  it("uses idx_chat_sessions_site_last for site-scoped list queries", async () => {
    const plan = await db()
      .prepare(
        "EXPLAIN QUERY PLAN SELECT * FROM chat_sessions WHERE site_id = ? ORDER BY last_message_at DESC LIMIT 20",
      )
      .bind("site_crud_A")
      .all<{ detail: string }>();
    const detail = plan.results.map((r) => r.detail).join(" | ");
    expect(detail.toLowerCase()).toContain("idx_chat_sessions_site_last");
  });
});
