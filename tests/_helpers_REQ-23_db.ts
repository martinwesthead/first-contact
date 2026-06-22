import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  MIGRATIONS_DIR,
  MIGRATIONS_DOWN_DIR,
  createTestDb as createReq10Db,
  type TestDb,
} from "./_helpers_REQ-10_db.js";

export const REQ_23_FORWARD_MIGRATIONS = [
  "0006_create_chat_sessions.sql",
  "0007_create_chat_messages.sql",
  "0008_create_reference_docs.sql",
];

export const REQ_23_DOWN_MIGRATIONS = [
  "0008_create_reference_docs.down.sql",
  "0007_create_chat_messages.down.sql",
  "0006_create_chat_sessions.down.sql",
];

interface D1Like {
  prepare: (sql: string) => D1Statement;
}

interface D1Statement {
  run: () => Promise<unknown>;
  all: <T = unknown>() => Promise<{ results: T[] }>;
  first: <T = unknown>() => Promise<T | null>;
  bind: (...args: unknown[]) => D1Statement;
}

export interface SeededSite {
  account_id: string;
  site_id: string;
}

export async function createReq23TestDb(): Promise<TestDb> {
  const base = await createReq10Db({ includeSeed: true });
  for (const name of REQ_23_FORWARD_MIGRATIONS) {
    await applySqlFileSmart(base.db as unknown as D1Like, resolve(MIGRATIONS_DIR, name));
  }
  return base;
}

export async function applyReq23DownMigrations(db: D1Like): Promise<void> {
  for (const name of REQ_23_DOWN_MIGRATIONS) {
    await applySqlFileSmart(db, resolve(MIGRATIONS_DOWN_DIR, name));
  }
}

export async function applySqlFileSmart(db: D1Like, path: string): Promise<void> {
  const sql = readFileSync(path, "utf-8");
  for (const stmt of splitSqlRespectingBeginEnd(sql)) {
    await db.prepare(stmt).run();
  }
}

// SQL splitter that respects SQLite BEGIN/END trigger blocks: top-level
// semicolons terminate a statement only when not nested inside BEGIN/END.
export function splitSqlRespectingBeginEnd(sql: string): string[] {
  const noLineComments = sql.replace(/^\s*--.*$/gm, "");
  const statements: string[] = [];
  let buffer = "";
  let depth = 0;
  const tokens = noLineComments.split(/(\bBEGIN\b|\bEND\b|;)/gi);
  for (const tok of tokens) {
    if (/^BEGIN$/i.test(tok)) {
      depth += 1;
      buffer += tok;
    } else if (/^END$/i.test(tok)) {
      depth = Math.max(0, depth - 1);
      buffer += tok;
    } else if (tok === ";") {
      if (depth === 0) {
        const trimmed = buffer.trim();
        if (trimmed.length > 0) statements.push(trimmed);
        buffer = "";
      } else {
        buffer += ";";
      }
    } else {
      buffer += tok;
    }
  }
  const tail = buffer.trim();
  if (tail.length > 0) statements.push(tail);
  return statements;
}

export async function insertSite(
  db: D1Like,
  opts: { id: string; account_id: string; slug: string },
): Promise<void> {
  const now = 1_700_000_000_000;
  await db
    .prepare(
      "INSERT INTO sites (id, account_id, slug, display_name, draft_definition, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(opts.id, opts.account_id, opts.slug, opts.slug, "{}", now, now)
    .run();
}

export async function insertSession(
  db: D1Like,
  opts: {
    id: string;
    site_id: string;
    user_id?: string | null;
    title?: string | null;
    created_at?: number;
  },
): Promise<void> {
  const ts = opts.created_at ?? 1_700_000_000_000;
  await db
    .prepare(
      "INSERT INTO chat_sessions (id, site_id, user_id, title, created_at, updated_at, last_message_at, message_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(opts.id, opts.site_id, opts.user_id ?? null, opts.title ?? null, ts, ts, null, 0)
    .run();
}

export async function insertMessage(
  db: D1Like,
  opts: {
    id: string;
    session_id: string;
    ord: number;
    role: "user" | "assistant" | "system" | "tool_result";
    content: string;
    tool_calls_json?: string | null;
    ts?: number;
  },
): Promise<void> {
  const ts = opts.ts ?? 1_700_000_000_000;
  await db
    .prepare(
      "INSERT INTO chat_messages (id, session_id, ord, role, content, tool_calls_json, ts) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(opts.id, opts.session_id, opts.ord, opts.role, opts.content, opts.tool_calls_json ?? null, ts)
    .run();
}

export async function insertReferenceDoc(
  db: D1Like,
  opts: {
    slug: string;
    title: string;
    summary: string;
    toc_json?: string;
    body: string;
    kind?: string;
  },
): Promise<void> {
  const now = 1_700_000_000_000;
  await db
    .prepare(
      "INSERT INTO reference_docs (slug, title, summary, toc_json, body, kind, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      opts.slug,
      opts.title,
      opts.summary,
      opts.toc_json ?? "[]",
      opts.body,
      opts.kind ?? "module",
      now,
      now,
    )
    .run();
}

export type { D1Like };
