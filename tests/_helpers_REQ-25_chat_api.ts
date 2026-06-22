/**
 * REQ-25 test helper: an in-memory mock of the REQ-24 chat API.
 *
 * Lets UI tests drive the chat-panel and main.ts end-to-end without
 * spinning up Miniflare + the control-app handlers. Tracks per-site
 * sessions and per-session messages, allocates ords, and serves the
 * endpoints exactly as REQ-24 does:
 *
 *   GET  /api/sites/:siteId/chats
 *   POST /api/sites/:siteId/chats
 *   GET  /api/chats/:sessionId/messages?before=:ord&limit=N
 *   POST /api/chats/:sessionId/messages
 *   DELETE /api/chats/:sessionId
 *   PATCH  /api/chats/:sessionId
 *   POST /api/chat      ← SSE; emits a tiny "done" frame so the driver
 *                         finishes without invoking real model logic.
 */

export interface MockSessionRow {
  id: string;
  site_id: string;
  title: string | null;
  created_at: number;
  updated_at: number;
  last_message_at: number;
  message_count: number;
}

export interface MockMessageRow {
  id: string;
  session_id: string;
  ord: number;
  role: "user" | "assistant" | "system" | "tool_result";
  content: string;
  tool_calls?: Array<Record<string, unknown>>;
  ts: number;
}

export interface MockChatApiOptions {
  /** Existing sessions to seed. */
  sessions?: MockSessionRow[];
  /** Existing messages to seed. */
  messages?: MockMessageRow[];
  /** Override the SSE 'done' text. Defaults to "Done.". */
  chatResponseText?: string;
}

export interface MockChatApi {
  fetch: typeof fetch;
  sessions: Map<string, MockSessionRow>;
  messagesBySession: Map<string, MockMessageRow[]>;
  /** Every Request the mock has seen — handy for assertions. */
  calls: Array<{ url: string; method: string; body: string }>;
  /** /api/chat last-seen body. */
  lastChatBody: Record<string, unknown> | null;
}

let sessionCounter = 0;
let messageCounter = 0;

export function createMockChatApi(
  opts: MockChatApiOptions = {},
): MockChatApi {
  const sessions = new Map<string, MockSessionRow>();
  for (const s of opts.sessions ?? []) sessions.set(s.id, { ...s });
  const messagesBySession = new Map<string, MockMessageRow[]>();
  for (const m of opts.messages ?? []) {
    const arr = messagesBySession.get(m.session_id) ?? [];
    arr.push({ ...m });
    messagesBySession.set(m.session_id, arr);
  }
  // Keep each session's message list sorted by ord asc, and denorms in sync.
  for (const [sid, arr] of messagesBySession) {
    arr.sort((a, b) => a.ord - b.ord);
    const session = sessions.get(sid);
    if (session && arr.length > 0) {
      session.message_count = arr.length;
      session.last_message_at = Math.max(
        session.last_message_at,
        arr[arr.length - 1]!.ts,
      );
    }
  }

  const calls: Array<{ url: string; method: string; body: string }> = [];
  const api: MockChatApi = {
    sessions,
    messagesBySession,
    calls,
    lastChatBody: null,
    fetch: (async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      const url = typeof input === "string" ? input : input.toString();
      const method = (init?.method ?? "GET").toUpperCase();
      const bodyText =
        typeof init?.body === "string"
          ? init.body
          : init?.body
            ? String(init.body)
            : "";
      calls.push({ url, method, body: bodyText });
      const parsed = new URL(url, "https://test.local");
      const path = parsed.pathname;

      // POST /api/sites/:siteId/chats
      const matchSiteChats = path.match(/^\/api\/sites\/([^/]+)\/chats\/?$/);
      if (matchSiteChats) {
        const siteId = decodeURIComponent(matchSiteChats[1]!);
        if (method === "POST") {
          const body = bodyText ? JSON.parse(bodyText) : {};
          const id = `sess_${++sessionCounter}_${siteId}`;
          const now = Math.floor(Date.now() / 1000);
          const row: MockSessionRow = {
            id,
            site_id: siteId,
            title: typeof body.title === "string" ? body.title : null,
            created_at: now,
            updated_at: now,
            last_message_at: now,
            message_count: 0,
          };
          sessions.set(id, row);
          return json(rowToWire(row), 201);
        }
        if (method === "GET") {
          const list = Array.from(sessions.values())
            .filter((s) => s.site_id === siteId)
            .sort((a, b) => b.last_message_at - a.last_message_at)
            .map(rowToWire);
          return json({ sessions: list });
        }
        return json({ error: "method not allowed" }, 405);
      }

      // GET/POST /api/chats/:id/messages
      const matchMessages = path.match(/^\/api\/chats\/([^/]+)\/messages\/?$/);
      if (matchMessages) {
        const sessionId = decodeURIComponent(matchMessages[1]!);
        const session = sessions.get(sessionId);
        if (!session) return json({ error: "session not found" }, 404);
        if (method === "GET") {
          const beforeRaw = parsed.searchParams.get("before");
          const limitRaw = parsed.searchParams.get("limit");
          const before = beforeRaw ? Number(beforeRaw) : null;
          const limit = limitRaw ? Number(limitRaw) : 50;
          const all = (messagesBySession.get(sessionId) ?? []).slice();
          const filtered =
            before === null ? all : all.filter((m) => m.ord < before);
          // Take last `limit` (the tail of `filtered`).
          const page = filtered.slice(-limit);
          return json({ messages: page.map(messageToWire) });
        }
        if (method === "POST") {
          const body = bodyText ? JSON.parse(bodyText) : {};
          const role = body.role as MockMessageRow["role"];
          const content = String(body.content ?? "");
          const arr = messagesBySession.get(sessionId) ?? [];
          const nextOrd = arr.length === 0 ? 0 : arr[arr.length - 1]!.ord + 1;
          const ts = Math.floor(Date.now() / 1000);
          const row: MockMessageRow = {
            id: `msg_${++messageCounter}`,
            session_id: sessionId,
            ord: nextOrd,
            role,
            content,
            ts,
          };
          if (Array.isArray(body.toolCalls)) {
            row.tool_calls = body.toolCalls;
          }
          arr.push(row);
          messagesBySession.set(sessionId, arr);
          session.message_count = arr.length;
          session.last_message_at = ts;
          session.updated_at = ts;
          return json(messageToWire(row), 201);
        }
        return json({ error: "method not allowed" }, 405);
      }

      // DELETE / PATCH /api/chats/:id
      const matchSession = path.match(/^\/api\/chats\/([^/]+)\/?$/);
      if (matchSession) {
        const sessionId = decodeURIComponent(matchSession[1]!);
        const session = sessions.get(sessionId);
        if (!session) return json({ error: "session not found" }, 404);
        if (method === "DELETE") {
          sessions.delete(sessionId);
          messagesBySession.delete(sessionId);
          return json({ deleted: true, sweptKeys: [] });
        }
        if (method === "PATCH") {
          const body = bodyText ? JSON.parse(bodyText) : {};
          if (typeof body.title !== "string" || body.title.length === 0) {
            return json({ error: "title required" }, 400);
          }
          session.title = body.title;
          session.updated_at = Math.floor(Date.now() / 1000);
          return json(rowToWire(session));
        }
        return json({ error: "method not allowed" }, 405);
      }

      // POST /api/chat — minimal SSE response. Records the body so tests
      // can assert sessionId / userMessage / no history.
      if (path === "/api/chat" && method === "POST") {
        const body = bodyText ? JSON.parse(bodyText) : {};
        api.lastChatBody = body;
        // Append the user message + a placeholder assistant message to the
        // server-side messages list so subsequent tail-loads see them.
        const sessionId = body.sessionId as string | undefined;
        if (sessionId && sessions.has(sessionId)) {
          const arr = messagesBySession.get(sessionId) ?? [];
          const ts = Math.floor(Date.now() / 1000);
          const userOrd = arr.length === 0 ? 0 : arr[arr.length - 1]!.ord + 1;
          arr.push({
            id: `msg_${++messageCounter}`,
            session_id: sessionId,
            ord: userOrd,
            role: "user",
            content: String(body.userMessage ?? ""),
            ts,
          });
          const assistantContent = opts.chatResponseText ?? "Done.";
          arr.push({
            id: `msg_${++messageCounter}`,
            session_id: sessionId,
            ord: userOrd + 1,
            role: "assistant",
            content: assistantContent,
            ts,
          });
          messagesBySession.set(sessionId, arr);
          const session = sessions.get(sessionId)!;
          session.message_count = arr.length;
          session.last_message_at = ts;
          session.updated_at = ts;
        }
        const text = opts.chatResponseText ?? "Done.";
        const sse =
          `event: done\ndata: ${JSON.stringify({
            text,
            toolCalls: [],
            systemActions: [],
            intentToken: null,
          })}\n\n`;
        return new Response(sse, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        });
      }

      return json({ error: "unknown path: " + path }, 404);
    }) as unknown as typeof fetch,
  };
  return api;
}

function rowToWire(s: MockSessionRow): Record<string, unknown> {
  return {
    id: s.id,
    site_id: s.site_id,
    title: s.title,
    created_at: s.created_at,
    updated_at: s.updated_at,
    last_message_at: s.last_message_at,
    message_count: s.message_count,
  };
}

function messageToWire(m: MockMessageRow): Record<string, unknown> {
  const wire: Record<string, unknown> = {
    id: m.id,
    session_id: m.session_id,
    ord: m.ord,
    role: m.role,
    content: m.content,
    ts: m.ts,
  };
  if (m.tool_calls) wire.tool_calls = m.tool_calls;
  return wire;
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
