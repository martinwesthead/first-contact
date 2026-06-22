import {
  appendMessage,
  createSession,
  deleteSession,
  getSession,
  listReferenceDocs,
  listSessions,
  readMessages,
  readReferenceDoc,
  updateSessionTitle,
  type Clock,
  type D1Binding,
  type IdGen,
  type R2Like,
} from "./chat-db.js";
import type { ChatMessageToolCall, ChatRole } from "@gendev/site-schema";

export interface ChatRoutesEnv {
  SITES_DB?: D1Database;
  ASSETS_BUCKET?: R2Bucket;
}

export interface ChatRoutesDeps {
  clock?: Clock;
  ids?: IdGen;
}

const VALID_ROLES: ReadonlySet<ChatRole> = new Set([
  "user",
  "assistant",
  "system",
  "tool_result",
]);

// Path matchers — regexes to avoid pulling in a router dep. Captures the
// relevant segment for the handler.
const SITE_CHATS_RE = /^\/api\/sites\/([^/]+)\/chats\/?$/;
const SESSION_MESSAGES_RE = /^\/api\/chats\/([^/]+)\/messages\/?$/;
const SESSION_ROOT_RE = /^\/api\/chats\/([^/]+)\/?$/;
const REFERENCE_DOC_RE = /^\/api\/reference-docs\/([^/]+)\/?$/;
const REFERENCE_DOCS_LIST = "/api/reference-docs";

export function matchChatRoute(url: URL): boolean {
  const p = url.pathname;
  return (
    SITE_CHATS_RE.test(p) ||
    SESSION_MESSAGES_RE.test(p) ||
    SESSION_ROOT_RE.test(p) ||
    p === REFERENCE_DOCS_LIST ||
    REFERENCE_DOC_RE.test(p)
  );
}

export async function handleChatRoute(
  request: Request,
  env: ChatRoutesEnv,
  deps: ChatRoutesDeps = {},
): Promise<Response> {
  const url = new URL(request.url);
  const p = url.pathname;
  if (!env.SITES_DB) return jsonError("SITES_DB binding missing", 500);
  const db = env.SITES_DB as unknown as D1Binding;

  let m: RegExpMatchArray | null;

  if ((m = p.match(SITE_CHATS_RE))) {
    const siteId = decodeSegment(m[1]!);
    if (!siteId) return jsonError("invalid site id", 400);
    if (request.method === "POST") return await postSession(db, siteId, request, deps);
    if (request.method === "GET") return await getSessions(db, siteId, url);
    return jsonError("method not allowed", 405);
  }

  if ((m = p.match(SESSION_MESSAGES_RE))) {
    const sessionId = decodeSegment(m[1]!);
    if (!sessionId) return jsonError("invalid session id", 400);
    if (request.method === "GET") return await getMessages(db, sessionId, url);
    if (request.method === "POST") return await postMessage(db, sessionId, request, deps);
    return jsonError("method not allowed", 405);
  }

  if ((m = p.match(SESSION_ROOT_RE))) {
    const sessionId = decodeSegment(m[1]!);
    if (!sessionId) return jsonError("invalid session id", 400);
    if (request.method === "DELETE") return await delSession(db, sessionId, env.ASSETS_BUCKET ?? null);
    if (request.method === "PATCH") return await patchSession(db, sessionId, request, deps);
    return jsonError("method not allowed", 405);
  }

  if (p === REFERENCE_DOCS_LIST) {
    if (request.method !== "GET") return jsonError("method not allowed", 405);
    const docs = await listReferenceDocs(db);
    return json({ docs });
  }

  if ((m = p.match(REFERENCE_DOC_RE))) {
    if (request.method !== "GET") return jsonError("method not allowed", 405);
    const slug = decodeSegment(m[1]!);
    if (!slug) return jsonError("invalid slug", 400);
    const section = url.searchParams.get("section");
    const doc = await readReferenceDoc(db, slug, section);
    if (!doc) return jsonError("not found", 404);
    return json(doc);
  }

  return jsonError("not found", 404);
}

async function postSession(
  db: D1Binding,
  siteId: string,
  request: Request,
  deps: ChatRoutesDeps,
): Promise<Response> {
  const body = await safeReadJsonBody(request);
  if (body.error) return body.error;
  const title = typeof body.value?.title === "string" ? body.value.title : null;
  const userId = typeof body.value?.userId === "string" ? body.value.userId : null;
  const session = await createSession(
    db,
    { site_id: siteId, user_id: userId, title },
    deps.ids,
    deps.clock,
  );
  return json(session, 201);
}

async function getSessions(
  db: D1Binding,
  siteId: string,
  url: URL,
): Promise<Response> {
  const limit = parseIntParam(url.searchParams.get("limit"));
  const before = parseIntParam(url.searchParams.get("before"));
  const sessions = await listSessions(db, {
    site_id: siteId,
    limit: limit ?? undefined,
    before,
  });
  return json({ sessions });
}

async function getMessages(
  db: D1Binding,
  sessionId: string,
  url: URL,
): Promise<Response> {
  const session = await getSession(db, sessionId);
  if (!session) return jsonError("session not found", 404);
  const before = parseIntParam(url.searchParams.get("before"));
  const limit = parseIntParam(url.searchParams.get("limit"));
  const messages = await readMessages(db, {
    session_id: sessionId,
    before,
    limit: limit ?? undefined,
  });
  return json({ messages });
}

async function postMessage(
  db: D1Binding,
  sessionId: string,
  request: Request,
  deps: ChatRoutesDeps,
): Promise<Response> {
  const session = await getSession(db, sessionId);
  if (!session) return jsonError("session not found", 404);
  const body = await safeReadJsonBody(request);
  if (body.error) return body.error;
  const role = body.value?.role;
  const content = body.value?.content;
  if (typeof role !== "string" || !VALID_ROLES.has(role as ChatRole)) {
    return jsonError("role must be one of user|assistant|system|tool_result", 400);
  }
  if (typeof content !== "string") return jsonError("content must be a string", 400);
  const rawToolCalls = body.value?.toolCalls;
  let toolCalls: ChatMessageToolCall[] | undefined;
  if (Array.isArray(rawToolCalls)) {
    toolCalls = rawToolCalls.filter(
      (c): c is ChatMessageToolCall =>
        c && typeof c === "object" && typeof (c as { name?: unknown }).name === "string",
    );
  }
  const appended = await appendMessage(
    db,
    {
      session_id: sessionId,
      role: role as ChatRole,
      content,
      tool_calls: toolCalls,
    },
    deps.ids,
    deps.clock,
  );
  return json(appended, 201);
}

async function delSession(
  db: D1Binding,
  sessionId: string,
  bucket: R2Like | null,
): Promise<Response> {
  const result = await deleteSession(db, sessionId, bucket);
  if (!result.deleted) return jsonError("session not found", 404);
  return json({ deleted: true, sweptKeys: result.sweptKeys });
}

async function patchSession(
  db: D1Binding,
  sessionId: string,
  request: Request,
  deps: ChatRoutesDeps,
): Promise<Response> {
  const session = await getSession(db, sessionId);
  if (!session) return jsonError("session not found", 404);
  const body = await safeReadJsonBody(request);
  if (body.error) return body.error;
  const title = body.value?.title;
  if (typeof title !== "string" || title.length === 0) {
    return jsonError("title must be a non-empty string", 400);
  }
  await updateSessionTitle(db, sessionId, title, deps.clock);
  const updated = await getSession(db, sessionId);
  return json(updated);
}

function decodeSegment(raw: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (decoded.length === 0) return null;
  if (decoded.includes("/")) return null;
  return decoded;
}

function parseIntParam(raw: string | null): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.floor(n);
}

interface ParsedBody {
  value: Record<string, unknown> | null;
  error: Response | null;
}

async function safeReadJsonBody(request: Request): Promise<ParsedBody> {
  if (request.method === "GET" || request.method === "DELETE") {
    return { value: {}, error: null };
  }
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    // Allow empty body for POST without content-type.
    const text = await request.text();
    if (text.length === 0) return { value: {}, error: null };
    return {
      value: null,
      error: jsonError("Content-Type must be application/json", 400),
    };
  }
  try {
    const value = (await request.json()) as Record<string, unknown>;
    if (value == null || typeof value !== "object" || Array.isArray(value)) {
      return { value: null, error: jsonError("body must be a JSON object", 400) };
    }
    return { value, error: null };
  } catch {
    return { value: null, error: jsonError("invalid JSON body", 400) };
  }
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
