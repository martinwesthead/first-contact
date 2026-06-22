import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  applyReq23DownMigrations,
  createReq23TestDb,
  type D1Like,
} from "./_helpers_REQ-23_db.js";
import type { TestDb } from "./_helpers_REQ-10_db.js";

interface NameRow {
  name: string;
}

describe("UAT FC REQ-23: down migrations cleanly drop the REQ-23 schema", () => {
  let test: TestDb;
  const db = (): D1Like => test.db as unknown as D1Like;

  beforeAll(async () => {
    test = await createReq23TestDb();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  it("creates the REQ-23 tables, FTS tables, indexes, and triggers on apply", async () => {
    const tables = await db()
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('chat_sessions','chat_messages','chat_messages_fts','reference_docs','reference_docs_fts')",
      )
      .all<NameRow>();
    expect(tables.results.map((r) => r.name).sort()).toEqual([
      "chat_messages",
      "chat_messages_fts",
      "chat_sessions",
      "reference_docs",
      "reference_docs_fts",
    ]);

    const indexes = await db()
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name IN ('idx_chat_sessions_site_last','idx_chat_messages_session_ord','idx_reference_docs_kind')",
      )
      .all<NameRow>();
    expect(indexes.results.map((r) => r.name).sort()).toEqual([
      "idx_chat_messages_session_ord",
      "idx_chat_sessions_site_last",
      "idx_reference_docs_kind",
    ]);

    const triggers = await db()
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'chat_messages_%' OR name LIKE 'reference_docs_%'",
      )
      .all<NameRow>();
    const triggerNames = new Set(triggers.results.map((r) => r.name));
    expect(triggerNames.has("chat_messages_ai")).toBe(true);
    expect(triggerNames.has("chat_messages_ad")).toBe(true);
    expect(triggerNames.has("chat_messages_au")).toBe(true);
    expect(triggerNames.has("reference_docs_ai")).toBe(true);
    expect(triggerNames.has("reference_docs_ad")).toBe(true);
    expect(triggerNames.has("reference_docs_au")).toBe(true);
  });

  it("drops all REQ-23 schema objects after running down migrations in reverse order", async () => {
    await applyReq23DownMigrations(db());

    const tables = await db()
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('chat_sessions','chat_messages','chat_messages_fts','reference_docs','reference_docs_fts')",
      )
      .all<NameRow>();
    expect(tables.results).toEqual([]);

    const indexes = await db()
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name IN ('idx_chat_sessions_site_last','idx_chat_messages_session_ord','idx_reference_docs_kind')",
      )
      .all<NameRow>();
    expect(indexes.results).toEqual([]);

    const triggers = await db()
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='trigger' AND name IN ('chat_messages_ai','chat_messages_ad','chat_messages_au','reference_docs_ai','reference_docs_ad','reference_docs_au')",
      )
      .all<NameRow>();
    expect(triggers.results).toEqual([]);

    // The REQ-10 base schema must survive a REQ-23 down sweep.
    const baseTables = await db()
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('accounts','sites','revisions')",
      )
      .all<NameRow>();
    expect(baseTables.results.map((r) => r.name).sort()).toEqual([
      "accounts",
      "revisions",
      "sites",
    ]);
  });
});
