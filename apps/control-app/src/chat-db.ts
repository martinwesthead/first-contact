import type {
  ChatMessageRecord,
  ChatMessageRecordParsed,
  ChatMessageToolCall,
  ChatRole,
  ChatSessionRecord,
  ReferenceDocRecord,
  ReferenceDocRecordParsed,
  ReferenceDocTocEntry,
} from "@1stcontact/site-schema";

export interface D1Binding {
  prepare(sql: string): D1Statement;
  batch?(statements: D1Statement[]): Promise<unknown>;
}

export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  run(): Promise<unknown>;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
}

export interface Clock {
  now(): number;
}

export const realClock: Clock = { now: (): number => Date.now() };

export interface IdGen {
  session(): string;
  message(): string;
}

export const realIdGen: IdGen = {
  session: (): string => `sess_${randomHex(16)}`,
  message: (): string => `msg_${randomHex(16)}`,
};

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface CreateSessionOpts {
  site_id: string;
  user_id?: string | null;
  title?: string | null;
}

export async function createSession(
  db: D1Binding,
  opts: CreateSessionOpts,
  ids: IdGen = realIdGen,
  clock: Clock = realClock,
): Promise<ChatSessionRecord> {
  const id = ids.session();
  const now = clock.now();
  await db
    .prepare(
      "INSERT INTO chat_sessions (id, site_id, user_id, title, created_at, updated_at, last_message_at, message_count) VALUES (?, ?, ?, ?, ?, ?, NULL, 0)",
    )
    .bind(id, opts.site_id, opts.user_id ?? null, opts.title ?? null, now, now)
    .run();
  return {
    id,
    site_id: opts.site_id,
    user_id: opts.user_id ?? null,
    title: opts.title ?? null,
    created_at: now,
    updated_at: now,
    last_message_at: null,
    message_count: 0,
  };
}

export async function getSession(
  db: D1Binding,
  sessionId: string,
): Promise<ChatSessionRecord | null> {
  return await db
    .prepare(
      "SELECT id, site_id, user_id, title, created_at, updated_at, last_message_at, message_count FROM chat_sessions WHERE id = ?",
    )
    .bind(sessionId)
    .first<ChatSessionRecord>();
}

export interface ListSessionsOpts {
  site_id: string;
  limit?: number;
  before?: number | null;
}

export async function listSessions(
  db: D1Binding,
  opts: ListSessionsOpts,
): Promise<ChatSessionRecord[]> {
  const limit = clampLimit(opts.limit, 20, 100);
  if (opts.before != null) {
    const res = await db
      .prepare(
        "SELECT id, site_id, user_id, title, created_at, updated_at, last_message_at, message_count FROM chat_sessions WHERE site_id = ? AND (last_message_at IS NOT NULL AND last_message_at < ?) ORDER BY last_message_at DESC LIMIT ?",
      )
      .bind(opts.site_id, opts.before, limit)
      .all<ChatSessionRecord>();
    return res.results;
  }
  const res = await db
    .prepare(
      "SELECT id, site_id, user_id, title, created_at, updated_at, last_message_at, message_count FROM chat_sessions WHERE site_id = ? ORDER BY (last_message_at IS NULL), last_message_at DESC, created_at DESC LIMIT ?",
    )
    .bind(opts.site_id, limit)
    .all<ChatSessionRecord>();
  return res.results;
}

export interface AppendMessageOpts {
  session_id: string;
  role: ChatRole;
  content: string;
  tool_calls?: ReadonlyArray<ChatMessageToolCall> | null;
}

export async function appendMessage(
  db: D1Binding,
  opts: AppendMessageOpts,
  ids: IdGen = realIdGen,
  clock: Clock = realClock,
): Promise<ChatMessageRecordParsed> {
  const ts = clock.now();
  const id = ids.message();
  const tool_calls_json = opts.tool_calls && opts.tool_calls.length > 0
    ? JSON.stringify(opts.tool_calls)
    : null;
  // D1 doesn't expose interactive transactions; batch is atomic.
  const nextOrdRow = await db
    .prepare(
      "SELECT COALESCE(MAX(ord), -1) + 1 AS next_ord FROM chat_messages WHERE session_id = ?",
    )
    .bind(opts.session_id)
    .first<{ next_ord: number }>();
  const ord = nextOrdRow?.next_ord ?? 0;

  const insertMsg = db
    .prepare(
      "INSERT INTO chat_messages (id, session_id, ord, role, content, tool_calls_json, ts) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(id, opts.session_id, ord, opts.role, opts.content, tool_calls_json, ts);
  const updateSession = db
    .prepare(
      "UPDATE chat_sessions SET last_message_at = ?, updated_at = ?, message_count = message_count + 1 WHERE id = ?",
    )
    .bind(ts, ts, opts.session_id);

  if (typeof db.batch === "function") {
    await db.batch([insertMsg, updateSession]);
  } else {
    await insertMsg.run();
    await updateSession.run();
  }
  return {
    id,
    session_id: opts.session_id,
    ord,
    role: opts.role,
    content: opts.content,
    ts,
    tool_calls: opts.tool_calls && opts.tool_calls.length > 0 ? opts.tool_calls : null,
  };
}

export interface ReadMessagesOpts {
  session_id: string;
  before?: number | null;
  limit?: number;
}

const DEFAULT_MESSAGE_PAGE = 50;
const MAX_MESSAGE_PAGE = 200;

export async function readMessages(
  db: D1Binding,
  opts: ReadMessagesOpts,
): Promise<ChatMessageRecordParsed[]> {
  const limit = clampLimit(opts.limit, DEFAULT_MESSAGE_PAGE, MAX_MESSAGE_PAGE);
  if (opts.before != null) {
    const res = await db
      .prepare(
        "SELECT id, session_id, ord, role, content, tool_calls_json, ts FROM chat_messages WHERE session_id = ? AND ord < ? ORDER BY ord DESC LIMIT ?",
      )
      .bind(opts.session_id, opts.before, limit)
      .all<ChatMessageRecord>();
    return res.results.map(parseMessage).reverse();
  }
  const res = await db
    .prepare(
      "SELECT id, session_id, ord, role, content, tool_calls_json, ts FROM chat_messages WHERE session_id = ? ORDER BY ord DESC LIMIT ?",
    )
    .bind(opts.session_id, limit)
    .all<ChatMessageRecord>();
  return res.results.map(parseMessage).reverse();
}

export async function loadTail(
  db: D1Binding,
  sessionId: string,
  charBudget: number,
): Promise<ChatMessageRecordParsed[]> {
  // Walk backward from the newest ord; accumulate content chars until we
  // meet (or exceed) the budget. Then reverse to oldest-first for priming.
  const res = await db
    .prepare(
      "SELECT id, session_id, ord, role, content, tool_calls_json, ts FROM chat_messages WHERE session_id = ? ORDER BY ord DESC",
    )
    .bind(sessionId)
    .all<ChatMessageRecord>();
  const picked: ChatMessageRecord[] = [];
  let chars = 0;
  for (const row of res.results) {
    picked.push(row);
    chars += row.content?.length ?? 0;
    if (chars >= charBudget) break;
  }
  return picked.map(parseMessage).reverse();
}

export interface SearchHit {
  session_id: string;
  ord: number;
  snippet: string;
}

export async function searchTranscripts(
  db: D1Binding,
  siteId: string,
  query: string,
  limit = 20,
): Promise<SearchHit[]> {
  const safeLimit = clampLimit(limit, 20, 100);
  // Normalise FTS5 input: split on whitespace and special operators
  // (`-` `:` `^` `+` `*` `(` `)`), drop empty tokens, then quote each
  // surviving token so it's treated as a literal term. AND-join with a
  // space — FTS5 defaults to implicit AND between adjacent terms.
  const tokens = query
    .split(/[\s\-:^+*()"\\]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((t) => `"${t.replace(/"/g, '""')}"`);
  if (tokens.length === 0) return [];
  const ftsMatch = tokens.join(" ");
  const res = await db
    .prepare(
      "SELECT m.session_id AS session_id, m.ord AS ord, snippet(chat_messages_fts, 0, '[', ']', '…', 32) AS snippet FROM chat_messages_fts JOIN chat_messages m ON chat_messages_fts.rowid = m.rowid JOIN chat_sessions s ON s.id = m.session_id WHERE chat_messages_fts MATCH ? AND s.site_id = ? LIMIT ?",
    )
    .bind(ftsMatch, siteId, safeLimit)
    .all<SearchHit>();
  return res.results;
}

export async function readSessionRange(
  db: D1Binding,
  siteId: string,
  sessionId: string,
  fromOrd: number,
  toOrd: number,
): Promise<ChatMessageRecordParsed[] | null> {
  // site-scope enforcement: 404 to the caller if the session lives elsewhere.
  const owner = await db
    .prepare("SELECT site_id FROM chat_sessions WHERE id = ?")
    .bind(sessionId)
    .first<{ site_id: string }>();
  if (!owner || owner.site_id !== siteId) return null;
  const lo = Math.min(fromOrd, toOrd);
  const hi = Math.max(fromOrd, toOrd);
  const res = await db
    .prepare(
      "SELECT id, session_id, ord, role, content, tool_calls_json, ts FROM chat_messages WHERE session_id = ? AND ord >= ? AND ord <= ? ORDER BY ord ASC",
    )
    .bind(sessionId, lo, hi)
    .all<ChatMessageRecord>();
  return res.results.map(parseMessage);
}

export interface ReferenceDocSummary {
  slug: string;
  title: string;
  summary: string;
  kind: string;
}

export async function listReferenceDocs(
  db: D1Binding,
): Promise<ReferenceDocSummary[]> {
  const res = await db
    .prepare("SELECT slug, title, summary, kind FROM reference_docs ORDER BY slug ASC")
    .all<ReferenceDocSummary>();
  return res.results;
}

export interface ReadReferenceDocResult {
  slug: string;
  title: string;
  summary: string;
  toc: ReadonlyArray<ReferenceDocTocEntry>;
  body: string;
  section?: string;
}

export async function readReferenceDoc(
  db: D1Binding,
  slug: string,
  section?: string | null,
): Promise<ReadReferenceDocResult | null> {
  const row = await db
    .prepare(
      "SELECT slug, title, summary, toc_json, body, kind, created_at, updated_at FROM reference_docs WHERE slug = ?",
    )
    .bind(slug)
    .first<ReferenceDocRecord>();
  if (!row) return null;
  const parsed = parseReferenceDoc(row);
  if (!section) {
    return {
      slug: parsed.slug,
      title: parsed.title,
      summary: parsed.summary,
      toc: parsed.toc,
      body: parsed.body,
    };
  }
  const sliced = sliceSection(parsed.body, section);
  return {
    slug: parsed.slug,
    title: parsed.title,
    summary: parsed.summary,
    toc: parsed.toc,
    body: sliced,
    section,
  };
}

export async function updateSessionTitle(
  db: D1Binding,
  sessionId: string,
  title: string,
  clock: Clock = realClock,
): Promise<void> {
  const now = clock.now();
  await db
    .prepare("UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?")
    .bind(title, now, sessionId)
    .run();
}

export interface DeleteSessionResult {
  deleted: boolean;
  sweptKeys: string[];
}

export interface R2Like {
  delete(key: string): Promise<unknown>;
}

/**
 * Collect R2 attachment keys referenced from tool_calls_json on every message
 * in the session, delete the session (CASCADE cleans up messages + FTS), and
 * sweep R2. Attachment keys are recognised as any string value in the JSON
 * tree starting with `assets/` (the REQ-20 key convention).
 */
export async function deleteSession(
  db: D1Binding,
  sessionId: string,
  bucket: R2Like | null,
): Promise<DeleteSessionResult> {
  const owner = await db
    .prepare("SELECT id FROM chat_sessions WHERE id = ?")
    .bind(sessionId)
    .first<{ id: string }>();
  if (!owner) return { deleted: false, sweptKeys: [] };

  const tcRows = await db
    .prepare(
      "SELECT tool_calls_json FROM chat_messages WHERE session_id = ? AND tool_calls_json IS NOT NULL",
    )
    .bind(sessionId)
    .all<{ tool_calls_json: string }>();
  const keys = new Set<string>();
  for (const row of tcRows.results) {
    try {
      const parsed = JSON.parse(row.tool_calls_json);
      collectAssetKeys(parsed, keys);
    } catch {
      /* malformed tool_calls_json — skip; never block delete */
    }
  }

  await db
    .prepare("DELETE FROM chat_sessions WHERE id = ?")
    .bind(sessionId)
    .run();

  const swept: string[] = [];
  if (bucket) {
    for (const key of keys) {
      try {
        await bucket.delete(key);
        swept.push(key);
      } catch {
        /* swallow per-key R2 failures; session delete already committed */
      }
    }
  }
  return { deleted: true, sweptKeys: swept };
}

function collectAssetKeys(value: unknown, out: Set<string>): void {
  if (typeof value === "string") {
    if (value.startsWith("assets/")) out.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectAssetKeys(v, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectAssetKeys(v, out);
    }
  }
}

function parseMessage(row: ChatMessageRecord): ChatMessageRecordParsed {
  let tool_calls: ReadonlyArray<ChatMessageToolCall> | null = null;
  if (row.tool_calls_json) {
    try {
      const parsed = JSON.parse(row.tool_calls_json);
      if (Array.isArray(parsed)) tool_calls = parsed as ChatMessageToolCall[];
    } catch {
      /* preserve null on corrupt JSON */
    }
  }
  return {
    id: row.id,
    session_id: row.session_id,
    ord: row.ord,
    role: row.role,
    content: row.content,
    ts: row.ts,
    tool_calls,
  };
}

function parseReferenceDoc(row: ReferenceDocRecord): ReferenceDocRecordParsed {
  let toc: ReadonlyArray<ReferenceDocTocEntry> = [];
  try {
    const parsed = JSON.parse(row.toc_json);
    if (Array.isArray(parsed)) toc = parsed as ReferenceDocTocEntry[];
  } catch {
    /* preserve [] on corrupt JSON */
  }
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    body: row.body,
    kind: row.kind,
    created_at: row.created_at,
    updated_at: row.updated_at,
    toc,
  };
}

/**
 * Extract a single ## section from a Markdown body. The section is identified
 * by a slug derived from the heading text (lowercased, non-alphanumerics →
 * '-'). Returns the heading line + body until the next H2 (or end-of-body).
 * If no match, returns the full body unchanged so the model still has context.
 */
function sliceSection(body: string, sectionSlug: string): string {
  const lines = body.split(/\r?\n/);
  const target = sectionSlug.trim().toLowerCase();
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.startsWith("## ")) {
      const headingSlug = slugify(line.slice(3));
      if (headingSlug === target) {
        start = i;
        break;
      }
    }
  }
  if (start === -1) return body;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if ((lines[i] ?? "").startsWith("## ")) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n").trim();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clampLimit(
  raw: number | undefined,
  fallback: number,
  ceiling: number,
): number {
  if (!Number.isFinite(raw ?? NaN) || (raw ?? 0) <= 0) return fallback;
  const n = Math.floor(raw as number);
  return Math.min(n, ceiling);
}
