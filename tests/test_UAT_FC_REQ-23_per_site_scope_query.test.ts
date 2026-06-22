import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createReq23TestDb,
  insertMessage,
  insertSession,
  insertSite,
  type D1Like,
} from "./_helpers_REQ-23_db.js";
import type { TestDb } from "./_helpers_REQ-10_db.js";

interface MatchRow {
  session_id: string;
  ord: number;
  content: string;
}

// The canonical per-site search SQL: join FTS to chat_sessions on session_id,
// then constrain by chat_sessions.site_id. This is the contract DOC-10 §7.3
// names — Claude / the API MUST always pass through this join.
const SITE_SCOPED_FTS_SEARCH = `
  SELECT fts.session_id AS session_id, fts.ord AS ord, fts.content AS content
  FROM chat_messages_fts AS fts
  JOIN chat_sessions AS s ON s.id = fts.session_id
  WHERE s.site_id = ? AND chat_messages_fts MATCH ?
`;

describe("UAT FC REQ-23: per-site FTS scoping via join through chat_sessions", () => {
  let test: TestDb;
  const db = (): D1Like => test.db as unknown as D1Like;

  beforeAll(async () => {
    test = await createReq23TestDb();
    await insertSite(db(), {
      id: "site_A",
      account_id: "acct_1stcontact_platform",
      slug: "site-a",
    });
    await insertSite(db(), {
      id: "site_B",
      account_id: "acct_1stcontact_platform",
      slug: "site-b",
    });

    await insertSession(db(), { id: "sess_A1", site_id: "site_A" });
    await insertSession(db(), { id: "sess_B1", site_id: "site_B" });

    // Both sites discuss the same token, but the search must isolate them.
    await insertMessage(db(), {
      id: "msg_A1",
      session_id: "sess_A1",
      ord: 1,
      role: "user",
      content: "Please add a turquoise palette to the hero",
    });
    await insertMessage(db(), {
      id: "msg_B1",
      session_id: "sess_B1",
      ord: 1,
      role: "user",
      content: "I want a turquoise gradient banner instead",
    });
  });

  afterAll(async () => {
    await test.cleanup();
  });

  it("returns only the site_A message when scoped to site_A", async () => {
    const rows = await db()
      .prepare(SITE_SCOPED_FTS_SEARCH)
      .bind("site_A", "turquoise")
      .all<MatchRow>();
    expect(rows.results.length).toBe(1);
    expect(rows.results[0].session_id).toBe("sess_A1");
  });

  it("returns only the site_B message when scoped to site_B", async () => {
    const rows = await db()
      .prepare(SITE_SCOPED_FTS_SEARCH)
      .bind("site_B", "turquoise")
      .all<MatchRow>();
    expect(rows.results.length).toBe(1);
    expect(rows.results[0].session_id).toBe("sess_B1");
  });

  it("returns no rows for a site that has no matching messages", async () => {
    await insertSite(db(), {
      id: "site_C",
      account_id: "acct_1stcontact_platform",
      slug: "site-c",
    });
    const rows = await db()
      .prepare(SITE_SCOPED_FTS_SEARCH)
      .bind("site_C", "turquoise")
      .all<MatchRow>();
    expect(rows.results.length).toBe(0);
  });
});
