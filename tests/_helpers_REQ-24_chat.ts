import {
  createReq23TestDb,
  insertSession,
  insertSite,
  type D1Like,
} from "./_helpers_REQ-23_db.js";
import type { TestDb } from "./_helpers_REQ-10_db.js";

export interface SeededChatEnv {
  test: TestDb;
  db: D1Like;
  siteId: string;
  sessionId: string;
  cleanup: () => Promise<void>;
}

/**
 * Spin up a Miniflare D1, apply REQ-10 + REQ-23 migrations, seed one site +
 * one chat session, and return everything the REQ-24 chat-handler tests need
 * to call `handleChatRequest` end-to-end against a real D1.
 *
 * The siteId / sessionId default to deterministic strings so tests can refer
 * to them by name without round-tripping the DB.
 */
export async function seedChatSession(opts: {
  siteId?: string;
  sessionId?: string;
  title?: string | null;
} = {}): Promise<SeededChatEnv> {
  const test = await createReq23TestDb();
  const db = test.db as unknown as D1Like;
  const siteId = opts.siteId ?? "site_uat_req24";
  const sessionId = opts.sessionId ?? "sess_uat_req24";
  await insertSite(db, {
    id: siteId,
    account_id: "acct_1stcontact_platform",
    slug: `req24-${siteId}`,
  });
  await insertSession(db, {
    id: sessionId,
    site_id: siteId,
    title: opts.title ?? null,
  });
  return {
    test,
    db,
    siteId,
    sessionId,
    cleanup: () => test.cleanup(),
  };
}

export interface ChatBody {
  sessionId: string;
  userMessage: string;
  siteDefinition: unknown;
  frameworkCatalog: unknown;
}

export function buildChatRequest(body: ChatBody): Request {
  return new Request("https://app.1stcontact.io/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Minimal in-memory D1 binding for tests that can't host Miniflare's proxy
 * — most importantly tests running in `vitest-environment jsdom`, where the
 * Miniflare D1 proxy's reliance on Node fetch over the test's mocked global
 * fetch deadlocks.
 *
 * Implements only the SQL surface `handleChatRequest` uses: session lookup,
 * message append, tail load, reference-doc index, and title update. It
 * understands no real SQL — it pattern-matches against the prepared
 * statements in `chat-db.ts`. If chat-db grows new statements, add a case.
 */
export interface StubChatDb {
  binding: {
    prepare(sql: string): {
      bind(...values: unknown[]): {
        first<T = unknown>(): Promise<T | null>;
        run(): Promise<unknown>;
        all<T = unknown>(): Promise<{ results: T[] }>;
      };
      first<T = unknown>(): Promise<T | null>;
      all<T = unknown>(): Promise<{ results: T[] }>;
      run(): Promise<unknown>;
    };
  };
}

export function makeStubChatDb(opts: {
  sessionId: string;
  siteId?: string;
}): StubChatDb {
  const sessionId = opts.sessionId;
  const siteId = opts.siteId ?? "site_stub";
  let messageCount = 0;
  let title: string | null = null;
  const messages: Array<{
    id: string;
    session_id: string;
    ord: number;
    role: string;
    content: string;
    tool_calls_json: string | null;
    ts: number;
  }> = [];

  const session = (): {
    id: string;
    site_id: string;
    user_id: string | null;
    title: string | null;
    created_at: number;
    updated_at: number;
    last_message_at: number | null;
    message_count: number;
  } => ({
    id: sessionId,
    site_id: siteId,
    user_id: null,
    title,
    created_at: 1_700_000_000_000,
    updated_at: 1_700_000_000_000,
    last_message_at: messages.at(-1)?.ts ?? null,
    message_count: messageCount,
  });

  function bindStmt(sql: string, params: unknown[]): {
    first<T = unknown>(): Promise<T | null>;
    run(): Promise<unknown>;
    all<T = unknown>(): Promise<{ results: T[] }>;
  } {
    return {
      async first<T = unknown>(): Promise<T | null> {
        if (sql.startsWith("SELECT id, site_id, user_id, title")) {
          return session() as unknown as T;
        }
        if (sql.includes("COALESCE(MAX(ord)")) {
          return { next_ord: messageCount } as unknown as T;
        }
        return null;
      },
      async run(): Promise<unknown> {
        if (sql.startsWith("INSERT INTO chat_messages")) {
          messages.push({
            id: String(params[0]),
            session_id: String(params[1]),
            ord: Number(params[2]),
            role: String(params[3]),
            content: String(params[4]),
            tool_calls_json: params[5] == null ? null : String(params[5]),
            ts: Number(params[6]),
          });
          messageCount += 1;
        } else if (sql.startsWith("UPDATE chat_sessions SET title")) {
          title = String(params[0]);
        }
        return {};
      },
      async all<T = unknown>(): Promise<{ results: T[] }> {
        if (sql.includes("FROM chat_messages WHERE session_id = ? ORDER BY ord DESC")) {
          return {
            results: messages
              .slice()
              .sort((a, b) => b.ord - a.ord) as unknown as T[],
          };
        }
        if (sql.includes("FROM reference_docs ORDER BY slug")) {
          return { results: [] };
        }
        return { results: [] };
      },
    };
  }

  return {
    binding: {
      prepare(sql: string): {
        bind(...values: unknown[]): ReturnType<typeof bindStmt>;
        first<T = unknown>(): Promise<T | null>;
        all<T = unknown>(): Promise<{ results: T[] }>;
        run(): Promise<unknown>;
      } {
        const noArgs = bindStmt(sql, []);
        return {
          bind(...values: unknown[]): ReturnType<typeof bindStmt> {
            return bindStmt(sql, values);
          },
          first: noArgs.first.bind(noArgs),
          run: noArgs.run.bind(noArgs),
          all: noArgs.all.bind(noArgs),
        };
      },
    },
  };
}
