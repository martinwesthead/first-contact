import type { ChatMessage } from "./store.js";

/**
 * REQ-25: HTTP client for the REQ-24 session endpoints. Thin: parses JSON,
 * surfaces server errors as thrown `Error(message)`, and normalises the wire
 * `chat_messages` rows into the UI's `ChatMessage` shape. No retry / cache —
 * higher layers (the store) own that.
 */

export interface SessionSummary {
  readonly id: string;
  readonly title: string | null;
  readonly lastMessageAt: number;
  readonly messageCount: number;
}

export interface LoadedMessage {
  readonly ord: number;
  readonly message: ChatMessage;
}

export interface MessagesPage {
  readonly messages: ReadonlyArray<LoadedMessage>;
  readonly hasMoreOlder: boolean;
}

export interface ChatsApiOptions {
  /** Optional fetch override for tests. */
  fetch?: typeof fetch;
  /** Base origin (defaults to same-origin). */
  baseUrl?: string;
}

export class ChatsApi {
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor(options: ChatsApiOptions = {}) {
    // BUG-8: bind the default to globalThis. Calling `this.fetchImpl(...)`
    // would otherwise pass the ChatsApi instance as the receiver, which the
    // browser's Window-bound `fetch` rejects with a TypeError.
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.baseUrl = options.baseUrl ?? "";
  }

  async listSessions(siteId: string): Promise<ReadonlyArray<SessionSummary>> {
    const resp = await this.fetchImpl(
      `${this.baseUrl}/api/sites/${encodeURIComponent(siteId)}/chats`,
    );
    const body = (await this.parseJson(resp, "list sessions")) as {
      sessions?: Array<Record<string, unknown>>;
    };
    return (body.sessions ?? []).map(rowToSession);
  }

  async createSession(
    siteId: string,
    init: { title?: string | null } = {},
  ): Promise<SessionSummary> {
    const resp = await this.fetchImpl(
      `${this.baseUrl}/api/sites/${encodeURIComponent(siteId)}/chats`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: init.title ?? null }),
      },
    );
    const row = (await this.parseJson(resp, "create session")) as Record<
      string,
      unknown
    >;
    return rowToSession(row);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const resp = await this.fetchImpl(
      `${this.baseUrl}/api/chats/${encodeURIComponent(sessionId)}`,
      { method: "DELETE" },
    );
    if (!resp.ok) {
      throw new Error(`delete session ${sessionId} failed: ${resp.status}`);
    }
  }

  async patchSessionTitle(
    sessionId: string,
    title: string,
  ): Promise<SessionSummary> {
    const resp = await this.fetchImpl(
      `${this.baseUrl}/api/chats/${encodeURIComponent(sessionId)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      },
    );
    const row = (await this.parseJson(resp, "patch title")) as Record<
      string,
      unknown
    >;
    return rowToSession(row);
  }

  async loadTail(sessionId: string, limit = 50): Promise<MessagesPage> {
    return await this.loadMessages(sessionId, { limit });
  }

  async loadBefore(
    sessionId: string,
    beforeOrd: number,
    limit = 50,
  ): Promise<MessagesPage> {
    return await this.loadMessages(sessionId, { before: beforeOrd, limit });
  }

  /**
   * REQ-25 §"failure reinjection": the chat-driver persists synthetic system
   * notes (e.g. last turn's tool failures) via this endpoint so the server's
   * tail-load includes them on the next /api/chat call. Avoids resurrecting
   * the dead `history` field on the wire.
   */
  async appendMessage(
    sessionId: string,
    role: ChatMessage["role"],
    content: string,
  ): Promise<LoadedMessage> {
    const resp = await this.fetchImpl(
      `${this.baseUrl}/api/chats/${encodeURIComponent(sessionId)}/messages`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role, content }),
      },
    );
    const row = (await this.parseJson(resp, "append message")) as Record<
      string,
      unknown
    >;
    return rowToLoadedMessage(row);
  }

  private async loadMessages(
    sessionId: string,
    params: { before?: number; limit: number },
  ): Promise<MessagesPage> {
    const search = new URLSearchParams();
    if (params.before !== undefined) {
      search.set("before", String(params.before));
    }
    search.set("limit", String(params.limit));
    const resp = await this.fetchImpl(
      `${this.baseUrl}/api/chats/${encodeURIComponent(sessionId)}/messages?${search.toString()}`,
    );
    const body = (await this.parseJson(resp, "load messages")) as {
      messages?: Array<Record<string, unknown>>;
    };
    const rows = body.messages ?? [];
    const messages = rows.map(rowToLoadedMessage);
    // Server returns ASC by ord (per REQ-24 chat-db.readMessages). An empty
    // page or one shorter than the requested limit means no more older.
    const hasMoreOlder = rows.length >= params.limit;
    return { messages, hasMoreOlder };
  }

  private async parseJson(resp: Response, label: string): Promise<unknown> {
    let body: unknown;
    try {
      body = await resp.json();
    } catch {
      throw new Error(`${label}: invalid JSON response (status ${resp.status})`);
    }
    if (!resp.ok) {
      const errMsg =
        body && typeof body === "object" && "error" in body
          ? String((body as { error: unknown }).error)
          : `status ${resp.status}`;
      throw new Error(`${label}: ${errMsg}`);
    }
    return body;
  }
}

function rowToSession(row: Record<string, unknown>): SessionSummary {
  return {
    id: requireString(row.id, "session.id"),
    title:
      typeof row.title === "string" && row.title.length > 0 ? row.title : null,
    lastMessageAt:
      typeof row.last_message_at === "number" ? row.last_message_at : 0,
    messageCount:
      typeof row.message_count === "number" ? row.message_count : 0,
  };
}

function rowToLoadedMessage(row: Record<string, unknown>): LoadedMessage {
  const role = requireString(row.role, "message.role") as ChatMessage["role"];
  const content = requireString(row.content, "message.content");
  const ord = typeof row.ord === "number" ? row.ord : 0;
  const rawToolCalls = row.tool_calls ?? row.toolCalls;
  let toolCalls: ChatMessage["toolCalls"];
  if (Array.isArray(rawToolCalls)) {
    toolCalls = rawToolCalls
      .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
      .map((c) => ({
        name: requireString(c.name, "tool_call.name"),
        input:
          c.input && typeof c.input === "object" && !Array.isArray(c.input)
            ? (c.input as Record<string, unknown>)
            : {},
        accepted: c.accepted !== false,
        ...(typeof c.error === "string" ? { error: c.error } : {}),
      }));
  }
  return {
    ord,
    message: toolCalls ? { role, content, toolCalls } : { role, content },
  };
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`expected '${field}' to be a string`);
  }
  return value;
}
