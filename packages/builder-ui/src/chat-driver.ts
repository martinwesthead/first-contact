import type { Site } from "@1stcontact/site-schema";
import { validateSite } from "@1stcontact/site-schema";
import type { FrameworkCatalog } from "./catalog.js";
import { ChatsApi } from "./chats-api.js";
import type {
  BuilderStore,
  ChatMessage,
  ChatToolCallRecord,
  ChatToolResultRecord,
  PendingToolFailure,
} from "./store.js";
import { applyToolCall, type ToolApplyError, type ToolName } from "./tools.js";

export type ChatToolResult = ChatToolResultRecord;

export interface ChatTurnResult {
  readonly assistantText: string;
  readonly toolCalls: ReadonlyArray<ChatToolCallRecord>;
}

/** Tool-call event surfaced to the chat panel's live tool-use pane. */
export interface ChatToolEvent {
  readonly name: string;
  readonly input: Record<string, unknown>;
  readonly toolUseId: string;
  readonly status: "in_flight" | "accepted" | "rejected";
  /** Error message for rejected calls. */
  readonly error?: string;
}

export interface ChatDriverOptions {
  store: BuilderStore;
  catalog: FrameworkCatalog;
  endpoint?: string;
  fetch?: typeof fetch;
  /**
   * REQ-25: ID of the chat session this turn belongs to. Sent in the body
   * (server reads stored history; `history` field is gone). The store's
   * activeSessionId is used as a fallback. If neither is set the turn
   * aborts before the network call.
   */
  chatSessionId?: string | null;
  /**
   * Builder session ID. Sent as the `x-session-id` header on every POST so
   * the operator-action handlers (e.g. transcribe_site convert-consent
   * tracking) can correlate requests within a single browser session. When
   * absent the header is omitted and any tool that requires session
   * correlation will reject the call.
   */
  sessionId?: string | null;
  /** Optional AbortSignal so the panel's Stop button can cancel the turn. */
  signal?: AbortSignal;
  /** Called as each tool_call SSE event arrives, before server-side result. */
  onToolCallStart?: (event: ChatToolEvent) => void;
  /** Called when the server-side result for a tool_call arrives. */
  onToolCallResolved?: (event: ChatToolEvent) => void;
  /** Called once at the start of the turn so the panel can clear stale state. */
  onTurnStart?: () => void;
}

/** Final aggregate payload of the streaming chat response. */
interface ChatDonePayload {
  text: string;
  toolCalls: Array<{
    name: string;
    input: Record<string, unknown>;
    result?: ChatToolResultRecord;
  }>;
  systemActions: unknown;
  intentToken: string | null;
}

/**
 * One end-to-end chat turn (REQ-36 G9 streaming version):
 *   1. Append the user message + an empty in-flight assistant bubble.
 *   2. POST {sessionId, userMessage, siteDefinition, frameworkCatalog} to /api/chat (SSE).
 *   3. As `token` events arrive, grow the in-flight assistant message.
 *   4. As `tool_call` events arrive, fire onToolCallStart for the live
 *      tool-use pane and locally apply the tool call to the working site
 *      (mirrors the server's optimistic validation so the preview reacts
 *      mid-turn).
 *   5. As `tool_result` events arrive, fire onToolCallResolved.
 *   6. On `done`, commit the final assistant message with structured tool
 *      results so the inline ChatCard renderers fire.
 *
 * The driver never throws on a validator rejection — it records the failure
 * on the chat message so the user can see what the AI tried and why it was
 * refused (DOC-8 §5.3).
 */
export async function runChatTurn(
  userText: string,
  options: ChatDriverOptions,
): Promise<ChatTurnResult> {
  const endpoint = options.endpoint ?? "/api/chat";
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const chatSessionId =
    options.chatSessionId ?? options.store.getState().activeSessionId;
  if (!chatSessionId) {
    throw new Error(
      "runChatTurn: no chat session id (set options.chatSessionId or activate a session)",
    );
  }

  const chatsApi = new ChatsApi({ fetch: fetchImpl });

  // REQ-25 / REQ-37: prior turn's rejected tool calls are persisted as a
  // synthetic system message on the session so the server's tail-load picks
  // them up. (The dead `history` field is gone — we can't prepend it in-band
  // anymore.) Errors here are non-fatal: the panel still surfaces the
  // failure, and the next turn proceeds without the note.
  const carriedFailures = options.store.getState().pendingToolFailures;
  if (carriedFailures.length > 0) {
    const noteContent = formatFailureNote(carriedFailures);
    try {
      await chatsApi.appendMessage(chatSessionId, "system", noteContent);
      options.store.appendChatMessage({
        role: "system",
        content: noteContent,
      });
    } catch (err) {
      console.warn(
        "[chat-driver] failed to persist tool-failure note; continuing without reinjection",
        err,
      );
    }
    options.store.clearToolFailures();
  }

  const userMessage: ChatMessage = { role: "user", content: userText };
  options.store.appendChatMessage(userMessage);

  // Place the in-flight assistant bubble so the streaming token loop has a
  // slot to grow. Empty content until the first delta arrives.
  const inflightAssistant: ChatMessage = { role: "assistant", content: "" };
  options.store.appendChatMessage(inflightAssistant);

  if (options.onTurnStart) options.onTurnStart();

  const siteDefinition = options.store.getState().siteDefinition;
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (options.sessionId) headers["x-session-id"] = options.sessionId;
  const resp = await fetchImpl(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      sessionId: chatSessionId,
      userMessage: userText,
      siteDefinition,
      frameworkCatalog: options.catalog,
    }),
    signal: options.signal,
  });
  if (!resp.ok) {
    const error = `chat endpoint returned ${resp.status}`;
    const failed: ChatMessage = {
      role: "assistant",
      content: `Sorry — ${error}.`,
    };
    options.store.updateLastChatMessage(failed);
    return { assistantText: failed.content, toolCalls: [] };
  }

  let workingSite: Site = siteDefinition;
  const toolCallSummaries: ChatToolCallRecord[] = [];
  // State object so closure mutations survive TS's let-narrowing across
  // the reader.read() loop. Each field is widened via `as` at declaration.
  const stream: {
    text: string;
    done: ChatDonePayload | null;
    error: string | null;
  } = { text: "", done: null, error: null };

  if (!resp.body) {
    const failed: ChatMessage = {
      role: "assistant",
      content: "Sorry — chat response carried no body.",
    };
    options.store.updateLastChatMessage(failed);
    return { assistantText: failed.content, toolCalls: [] };
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const flushBuffer = (final: boolean): void => {
    let sep = buffer.indexOf("\n\n");
    while (sep !== -1) {
      handleFrame(buffer.slice(0, sep));
      buffer = buffer.slice(sep + 2);
      sep = buffer.indexOf("\n\n");
    }
    if (final && buffer.trim().length > 0) {
      handleFrame(buffer);
      buffer = "";
    }
  };

  const handleFrame = (raw: string): void => {
    const lines = raw.split("\n");
    let event = "message";
    const dataParts: string[] = [];
    for (const line of lines) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataParts.push(line.slice(5).replace(/^ /, ""));
      }
    }
    if (dataParts.length === 0) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(dataParts.join("\n"));
    } catch {
      return;
    }
    switch (event) {
      case "token": {
        const delta = (parsed as { delta?: string }).delta ?? "";
        stream.text += delta;
        options.store.updateLastChatMessage({
          role: "assistant",
          content: stream.text,
        });
        return;
      }
      case "tool_call": {
        const ev = parsed as {
          name: string;
          input: Record<string, unknown>;
          toolUseId: string;
        };
        if (options.onToolCallStart) {
          options.onToolCallStart({ ...ev, status: "in_flight" });
        }
        return;
      }
      case "tool_result": {
        const ev = parsed as {
          name: string;
          input: Record<string, unknown>;
          toolUseId: string;
          result: ChatToolResultRecord;
        };
        // Mirror the server's tool execution on the working site so the
        // preview reacts as the turn progresses. The server-side result is
        // the source of truth; the local apply just keeps preview state
        // consistent. Same code path as the legacy post-turn replay.
        const serverResult = ev.result;
        const cleared = extractClearedSite(serverResult);
        if (cleared) {
          workingSite = cleared;
          toolCallSummaries.push({
            name: ev.name,
            input: ev.input,
            accepted: true,
            result: serverResult,
          });
        } else {
          const applyResult = applyToolCall(workingSite, options.catalog, {
            name: ev.name as ToolName,
            input: ev.input,
          });
          if (applyResult.ok) {
            workingSite = applyResult.next;
            toolCallSummaries.push({
              name: ev.name,
              input: ev.input,
              accepted: true,
              result: serverResult,
            });
          } else {
            toolCallSummaries.push({
              name: ev.name,
              input: ev.input,
              accepted: false,
              error: formatError(applyResult.error),
              result: serverResult,
            });
          }
        }
        if (options.onToolCallResolved) {
          const last = toolCallSummaries[toolCallSummaries.length - 1]!;
          options.onToolCallResolved({
            name: ev.name,
            input: ev.input,
            toolUseId: ev.toolUseId,
            status: last.accepted ? "accepted" : "rejected",
            ...(last.error ? { error: last.error } : {}),
          });
        }
        return;
      }
      case "done":
        stream.done = parsed as ChatDonePayload;
        return;
      case "error":
        stream.error = (parsed as { error?: string }).error ?? "unknown error";
        return;
      default:
        return;
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      flushBuffer(false);
    }
    flushBuffer(true);
  } catch (err) {
    stream.error = err instanceof Error ? err.message : String(err);
  }

  if (stream.error) {
    const failed: ChatMessage = {
      role: "assistant",
      content: `Sorry — ${stream.error}.`,
    };
    options.store.updateLastChatMessage(failed);
    return { assistantText: failed.content, toolCalls: [] };
  }

  if (workingSite !== siteDefinition) {
    options.store.setSiteDefinition(workingSite);
  }

  // Finalise the assistant bubble. Prefer the `done` text (server-side
  // canonical) over the assembled stream; with our impl they should match
  // but `done` survives intermediate parse failures.
  const finalText = stream.done?.text ?? stream.text;
  options.store.updateLastChatMessage({
    role: "assistant",
    content: finalText,
    toolCalls: toolCallSummaries,
  });

  // REQ-37: persist any rejected tool calls from this turn so the chat panel
  // can surface them and the next outbound turn can reinject them.
  const turnFailures: PendingToolFailure[] = toolCallSummaries
    .filter((c) => !c.accepted)
    .map((c) => ({
      name: c.name,
      input: c.input,
      error: c.error ?? "rejected",
    }));
  options.store.recordToolFailures(turnFailures);

  return { assistantText: finalText, toolCalls: toolCallSummaries };
}

function formatFailureNote(failures: ReadonlyArray<PendingToolFailure>): string {
  const lines = [
    `[system] The previous turn produced ${failures.length} failed tool call${failures.length === 1 ? "" : "s"}. Review the errors and retry where appropriate:`,
  ];
  for (const f of failures) {
    const argsPreview = JSON.stringify(f.input);
    lines.push(`- ${f.name}(${argsPreview}) → ${f.error}`);
  }
  return lines.join("\n");
}

function extractClearedSite(
  result: ChatToolResultRecord | undefined,
): Site | null {
  if (!result || !result.ok) return null;
  if (result.applied.kind !== "transcribe_site_done") return null;
  const data = result.applied.data as
    | { clearedSiteDefinition?: unknown }
    | undefined;
  if (!data || data.clearedSiteDefinition === undefined) return null;
  const validation = validateSite(data.clearedSiteDefinition);
  return validation.ok ? validation.value : null;
}

function formatError(error: ToolApplyError): string {
  if (error.path && error.expected) {
    const expected = Array.isArray(error.expected)
      ? error.expected.join(", ")
      : String(error.expected);
    return `${error.message} (path: ${error.path}, expected: [${expected}], got: ${String(
      error.got,
    )})`;
  }
  return error.message;
}

