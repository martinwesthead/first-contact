import { describe, expect, it } from "vitest";
import {
  applyReq23DownMigrations,
  createReq23TestDb,
  insertMessage,
  insertReferenceDoc,
  insertSession,
  insertSite,
  type D1Like,
} from "./_helpers_REQ-23_db.js";

// Reconciliation UATs for story-1e174b7c — persistence schema for per-site chat
// sessions, append-only chat messages, and the reference-doc library.
//
// One UAT per acceptance criterion (AC-793 .. AC-799). Each test is fully
// self-contained: it provisions a migrated, isolated Miniflare D1 database,
// exercises the behaviour through the same SQL surface the production access
// paths use, and tears the database down. No runtime code is exercised through
// internal callables — every assertion goes through the SQLite boundary the
// schema defines.

const ACCOUNT_ID = "acct_1stcontact_platform";

interface NameRow {
  name: string;
}

interface CountRow {
  c: number;
}

interface PlanRow {
  detail: string;
}

describe("Reconciliation: chat & reference-doc persistence schema (story-1e174b7c)", () => {
  it("test_UAT_AC793_chat_session_roundtrip_and_site_activity_list_index", async () => {
    const test = await createReq23TestDb();
    const db = test.db as unknown as D1Like;
    try {
      await insertSite(db, { id: "site_793", account_id: ACCOUNT_ID, slug: "site-793" });

      // A session may have an absent user and title; message_count defaults to
      // 0 and last_message_at is absent until activity is recorded.
      await insertSession(db, { id: "sess_793_a", site_id: "site_793", user_id: null, title: null });

      interface SessionRow {
        id: string;
        site_id: string;
        user_id: string | null;
        title: string | null;
        created_at: number;
        updated_at: number;
        last_message_at: number | null;
        message_count: number;
      }
      const bare = await db
        .prepare(
          "SELECT id, site_id, user_id, title, created_at, updated_at, last_message_at, message_count FROM chat_sessions WHERE id = ?",
        )
        .bind("sess_793_a")
        .first<SessionRow>();
      expect(bare).not.toBeNull();
      expect(bare?.id).toBe("sess_793_a");
      expect(bare?.site_id).toBe("site_793");
      expect(bare?.user_id).toBeNull();
      expect(bare?.title).toBeNull();
      expect(bare?.last_message_at).toBeNull();
      expect(bare?.message_count).toBe(0);
      expect(typeof bare?.created_at).toBe("number");
      expect(typeof bare?.updated_at).toBe("number");

      // A populated session round-trips its optional user and title intact.
      await insertSession(db, {
        id: "sess_793_b",
        site_id: "site_793",
        user_id: "user_owner_1",
        title: "Redesign the hero",
      });
      const titled = await db
        .prepare("SELECT user_id, title FROM chat_sessions WHERE id = ?")
        .bind("sess_793_b")
        .first<SessionRow>();
      expect(titled?.user_id).toBe("user_owner_1");
      expect(titled?.title).toBe("Redesign the hero");

      // The site-scoped, newest-activity-first list uses the dedicated index
      // rather than scanning unrelated sites' sessions.
      const plan = await db
        .prepare(
          "EXPLAIN QUERY PLAN SELECT * FROM chat_sessions WHERE site_id = ? ORDER BY last_message_at DESC LIMIT 20",
        )
        .bind("site_793")
        .all<PlanRow>();
      const detail = plan.results.map((r) => r.detail).join(" | ").toLowerCase();
      expect(detail).toContain("idx_chat_sessions_site_last");
    } finally {
      await test.cleanup();
    }
  });

  it("test_UAT_AC794_messages_strictly_increasing_ordinal_unique_and_tail_index", async () => {
    const test = await createReq23TestDb();
    const db = test.db as unknown as D1Like;
    try {
      await insertSite(db, { id: "site_794", account_id: ACCOUNT_ID, slug: "site-794" });
      await insertSession(db, { id: "sess_794", site_id: "site_794" });

      const toolPayload = JSON.stringify([{ name: "set_theme", input: { primary: "#0af" } }]);
      await insertMessage(db, { id: "m_794_1", session_id: "sess_794", ord: 1, role: "user", content: "first" });
      await insertMessage(db, {
        id: "m_794_2",
        session_id: "sess_794",
        ord: 2,
        role: "assistant",
        content: "second",
        tool_calls_json: toolPayload,
      });
      await insertMessage(db, { id: "m_794_3", session_id: "sess_794", ord: 3, role: "user", content: "third" });

      interface MessageRow {
        id: string;
        session_id: string;
        ord: number;
        role: string;
        content: string;
        tool_calls_json: string | null;
        ts: number;
      }
      const rows = await db
        .prepare(
          "SELECT id, session_id, ord, role, content, tool_calls_json, ts FROM chat_messages WHERE session_id = ? ORDER BY ord ASC",
        )
        .bind("sess_794")
        .all<MessageRow>();
      expect(rows.results.map((r) => r.ord)).toEqual([1, 2, 3]);
      expect(rows.results.map((r) => r.content)).toEqual(["first", "second", "third"]);
      expect(rows.results[1].role).toBe("assistant");
      expect(rows.results[1].tool_calls_json).toBe(toolPayload);
      expect(rows.results[0].tool_calls_json).toBeNull();
      expect(typeof rows.results[0].ts).toBe("number");

      // A second message reusing an already-stored (session, ord) pair is rejected.
      await expect(
        insertMessage(db, {
          id: "m_794_dup",
          session_id: "sess_794",
          ord: 2,
          role: "assistant",
          content: "duplicate ordinal",
        }),
      ).rejects.toThrow();

      // The per-session tail query is served by the session/ordinal index.
      const plan = await db
        .prepare(
          "EXPLAIN QUERY PLAN SELECT * FROM chat_messages WHERE session_id = ? AND ord < ? ORDER BY ord DESC LIMIT 50",
        )
        .bind("sess_794", 1000)
        .all<PlanRow>();
      const detail = plan.results.map((r) => r.detail).join(" | ").toLowerCase();
      expect(detail).toContain("idx_chat_messages_session_ord");
    } finally {
      await test.cleanup();
    }
  });

  it("test_UAT_AC795_message_fts_consistent_across_insert_update_delete", async () => {
    const test = await createReq23TestDb();
    const db = test.db as unknown as D1Like;
    try {
      await insertSite(db, { id: "site_795", account_id: ACCOUNT_ID, slug: "site-795" });
      await insertSession(db, { id: "sess_795", site_id: "site_795" });

      const matchCount = async (term: string): Promise<number> => {
        const row = await db
          .prepare("SELECT count(*) AS c FROM chat_messages_fts WHERE chat_messages_fts MATCH ?")
          .bind(term)
          .first<CountRow>();
        return row?.c ?? -1;
      };

      // Insert: a content term becomes findable.
      await insertMessage(db, {
        id: "m_795",
        session_id: "sess_795",
        ord: 1,
        role: "user",
        content: "make the hero feel cinematic",
      });
      expect(await matchCount("cinematic")).toBe(1);

      // Update: search follows the new content and forgets the removed term.
      await db
        .prepare("UPDATE chat_messages SET content = ? WHERE id = ?")
        .bind("make the hero feel oceanic instead", "m_795")
        .run();
      expect(await matchCount("cinematic")).toBe(0);
      expect(await matchCount("oceanic")).toBe(1);

      // Delete: the row disappears from the index entirely.
      await db.prepare("DELETE FROM chat_messages WHERE id = ?").bind("m_795").run();
      expect(await matchCount("oceanic")).toBe(0);
    } finally {
      await test.cleanup();
    }
  });

  it("test_UAT_AC796_message_fts_search_is_scoped_to_a_single_site", async () => {
    const test = await createReq23TestDb();
    const db = test.db as unknown as D1Like;
    try {
      // Per-site scoping is achieved by joining FTS matches back through the
      // owning session to its site.
      const SITE_SCOPED_SEARCH = `
        SELECT fts.session_id AS session_id
        FROM chat_messages_fts AS fts
        JOIN chat_sessions AS s ON s.id = fts.session_id
        WHERE s.site_id = ? AND chat_messages_fts MATCH ?
      `;

      await insertSite(db, { id: "site_796_A", account_id: ACCOUNT_ID, slug: "site-796-a" });
      await insertSite(db, { id: "site_796_B", account_id: ACCOUNT_ID, slug: "site-796-b" });
      await insertSession(db, { id: "sess_796_A", site_id: "site_796_A" });
      await insertSession(db, { id: "sess_796_B", site_id: "site_796_B" });

      // Both sites mention the same term; scoping must isolate them.
      await insertMessage(db, {
        id: "m_796_A",
        session_id: "sess_796_A",
        ord: 1,
        role: "user",
        content: "add a turquoise palette to the hero",
      });
      await insertMessage(db, {
        id: "m_796_B",
        session_id: "sess_796_B",
        ord: 1,
        role: "user",
        content: "I want a turquoise gradient banner",
      });

      const scoped = async (siteId: string, term: string): Promise<string[]> => {
        const rows = await db
          .prepare(SITE_SCOPED_SEARCH)
          .bind(siteId, term)
          .all<{ session_id: string }>();
        return rows.results.map((r) => r.session_id);
      };

      expect(await scoped("site_796_A", "turquoise")).toEqual(["sess_796_A"]);
      expect(await scoped("site_796_B", "turquoise")).toEqual(["sess_796_B"]);

      // A site with no matching content returns nothing.
      await insertSite(db, { id: "site_796_C", account_id: ACCOUNT_ID, slug: "site-796-c" });
      expect(await scoped("site_796_C", "turquoise")).toEqual([]);
    } finally {
      await test.cleanup();
    }
  });

  it("test_UAT_AC797_site_and_session_delete_cascades_to_messages_and_fts", async () => {
    const test = await createReq23TestDb();
    const db = test.db as unknown as D1Like;
    try {
      await db.prepare("PRAGMA foreign_keys = ON").run();

      const sessionCount = async (siteId: string): Promise<number> =>
        (await db
          .prepare("SELECT count(*) AS c FROM chat_sessions WHERE site_id = ?")
          .bind(siteId)
          .first<CountRow>())?.c ?? -1;
      const messageCount = async (sessionId: string): Promise<number> =>
        (await db
          .prepare("SELECT count(*) AS c FROM chat_messages WHERE session_id = ?")
          .bind(sessionId)
          .first<CountRow>())?.c ?? -1;
      const ftsCount = async (term: string): Promise<number> =>
        (await db
          .prepare("SELECT count(*) AS c FROM chat_messages_fts WHERE chat_messages_fts MATCH ?")
          .bind(term)
          .first<CountRow>())?.c ?? -1;

      // Site with one session and two messages.
      await insertSite(db, { id: "site_797", account_id: ACCOUNT_ID, slug: "site-797" });
      await insertSession(db, { id: "sess_797", site_id: "site_797" });
      await insertMessage(db, { id: "m_797_1", session_id: "sess_797", ord: 1, role: "user", content: "cascadealpha" });
      await insertMessage(db, { id: "m_797_2", session_id: "sess_797", ord: 2, role: "assistant", content: "cascadebeta" });
      expect(await sessionCount("site_797")).toBe(1);
      expect(await messageCount("sess_797")).toBe(2);
      expect(await ftsCount("cascadealpha")).toBe(1);

      // Deleting the site removes its sessions, their messages, and search rows.
      await db.prepare("DELETE FROM sites WHERE id = ?").bind("site_797").run();
      expect(await sessionCount("site_797")).toBe(0);
      expect(await messageCount("sess_797")).toBe(0);
      expect(await ftsCount("cascadealpha")).toBe(0);
      expect(await ftsCount("cascadebeta")).toBe(0);

      // Deleting only a session (its site survives) removes that session's
      // messages and their search rows.
      await insertSite(db, { id: "site_797b", account_id: ACCOUNT_ID, slug: "site-797-b" });
      await insertSession(db, { id: "sess_797b", site_id: "site_797b" });
      await insertMessage(db, { id: "m_797b", session_id: "sess_797b", ord: 1, role: "user", content: "cascadegamma" });
      expect(await ftsCount("cascadegamma")).toBe(1);

      await db.prepare("DELETE FROM chat_sessions WHERE id = ?").bind("sess_797b").run();
      expect(await messageCount("sess_797b")).toBe(0);
      expect(await ftsCount("cascadegamma")).toBe(0);

      const siteStillThere = await db
        .prepare("SELECT count(*) AS c FROM sites WHERE id = ?")
        .bind("site_797b")
        .first<CountRow>();
      expect(siteStillThere?.c).toBe(1);
    } finally {
      await test.cleanup();
    }
  });

  it("test_UAT_AC798_reference_docs_roundtrip_fts_and_kind_filter", async () => {
    const test = await createReq23TestDb();
    const db = test.db as unknown as D1Like;
    try {
      const matchSlugs = async (term: string): Promise<string[]> => {
        const rows = await db
          .prepare("SELECT slug FROM reference_docs_fts WHERE reference_docs_fts MATCH ?")
          .bind(term)
          .all<{ slug: string }>();
        return rows.results.map((r) => r.slug);
      };

      // Distinct field-specific terms ensure each FTS column is exercised
      // independently: "cinematic" (title), "responsiveness" (summary),
      // "spacingTop" (body).
      const toc = JSON.stringify([{ section_slug: "variants", description: "Allowed variants" }]);
      await insertReferenceDoc(db, {
        slug: "modules/hero-split",
        title: "Cinematic Hero Module",
        summary: "Controls layout responsiveness across breakpoints",
        toc_json: toc,
        body: "Dials: spacingTop and spacingBottom adjust vertical rhythm.",
        kind: "module",
      });

      // Round-trip: every stored field reads back intact.
      interface DocRow {
        slug: string;
        title: string;
        summary: string;
        toc_json: string;
        body: string;
        kind: string;
      }
      const doc = await db
        .prepare("SELECT slug, title, summary, toc_json, body, kind FROM reference_docs WHERE slug = ?")
        .bind("modules/hero-split")
        .first<DocRow>();
      expect(doc?.title).toBe("Cinematic Hero Module");
      expect(doc?.summary).toBe("Controls layout responsiveness across breakpoints");
      expect(doc?.toc_json).toBe(toc);
      expect(doc?.body).toBe("Dials: spacingTop and spacingBottom adjust vertical rhythm.");
      expect(doc?.kind).toBe("module");

      // Independently full-text searchable over title, summary, and body.
      expect(await matchSlugs("cinematic")).toContain("modules/hero-split");
      expect(await matchSlugs("responsiveness")).toContain("modules/hero-split");
      expect(await matchSlugs("spacingTop")).toContain("modules/hero-split");

      // Updating the body re-indexes: new term matches, old term does not.
      await db
        .prepare("UPDATE reference_docs SET body = ? WHERE slug = ?")
        .bind("Dials: photographic and illustrated treatments.", "modules/hero-split")
        .run();
      expect(await matchSlugs("spacingTop")).not.toContain("modules/hero-split");
      expect(await matchSlugs("photographic")).toContain("modules/hero-split");

      // A second doc of a different kind enables a kind-filtered access path.
      await insertReferenceDoc(db, {
        slug: "framework-principles",
        title: "Framework Principles",
        summary: "Composition model overview",
        body: "Tokens flow through CSS custom properties.",
        kind: "architecture",
      });
      const byKind = await db
        .prepare("SELECT slug FROM reference_docs WHERE kind = ? ORDER BY slug")
        .bind("architecture")
        .all<{ slug: string }>();
      expect(byKind.results.map((r) => r.slug)).toEqual(["framework-principles"]);

      const plan = await db
        .prepare("EXPLAIN QUERY PLAN SELECT * FROM reference_docs WHERE kind = ?")
        .bind("architecture")
        .all<PlanRow>();
      const detail = plan.results.map((r) => r.detail).join(" | ").toLowerCase();
      expect(detail).toContain("idx_reference_docs_kind");

      // Deleting a doc removes it from search.
      await db.prepare("DELETE FROM reference_docs WHERE slug = ?").bind("modules/hero-split").run();
      expect(await matchSlugs("photographic")).not.toContain("modules/hero-split");
    } finally {
      await test.cleanup();
    }
  });

  it("test_UAT_AC799_migrations_are_reversible_leaving_base_schema_intact", async () => {
    // Forward migrations (REQ-10 base + REQ-23) are applied by the helper.
    const test = await createReq23TestDb();
    const db = test.db as unknown as D1Like;
    try {
      const names = async (type: string): Promise<Set<string>> => {
        const rows = await db
          .prepare("SELECT name FROM sqlite_master WHERE type = ?")
          .bind(type)
          .all<NameRow>();
        return new Set(rows.results.map((r) => r.name));
      };

      // All chat/reference schema objects exist after forward migration.
      const tablesBefore = await names("table");
      for (const t of ["chat_sessions", "chat_messages", "chat_messages_fts", "reference_docs", "reference_docs_fts"]) {
        expect(tablesBefore.has(t)).toBe(true);
      }
      const indexesBefore = await names("index");
      for (const i of ["idx_chat_sessions_site_last", "idx_chat_messages_session_ord", "idx_reference_docs_kind"]) {
        expect(indexesBefore.has(i)).toBe(true);
      }
      const triggersBefore = await names("trigger");
      for (const tr of [
        "chat_messages_ai",
        "chat_messages_ad",
        "chat_messages_au",
        "reference_docs_ai",
        "reference_docs_ad",
        "reference_docs_au",
      ]) {
        expect(triggersBefore.has(tr)).toBe(true);
      }

      // The teardown must run cleanly (no error raised).
      await expect(applyReq23DownMigrations(db)).resolves.toBeUndefined();

      // None of the chat/reference objects remain.
      const tablesAfter = await names("table");
      for (const t of ["chat_sessions", "chat_messages", "chat_messages_fts", "reference_docs", "reference_docs_fts"]) {
        expect(tablesAfter.has(t)).toBe(false);
      }
      const indexesAfter = await names("index");
      for (const i of ["idx_chat_sessions_site_last", "idx_chat_messages_session_ord", "idx_reference_docs_kind"]) {
        expect(indexesAfter.has(i)).toBe(false);
      }
      const triggersAfter = await names("trigger");
      for (const tr of [
        "chat_messages_ai",
        "chat_messages_ad",
        "chat_messages_au",
        "reference_docs_ai",
        "reference_docs_ad",
        "reference_docs_au",
      ]) {
        expect(triggersAfter.has(tr)).toBe(false);
      }

      // The pre-existing accounts/sites/revisions schema is untouched.
      for (const base of ["accounts", "sites", "revisions"]) {
        expect(tablesAfter.has(base)).toBe(true);
      }
    } finally {
      await test.cleanup();
    }
  });
});
