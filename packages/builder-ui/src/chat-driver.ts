import type { Site } from "@1stcontact/site-schema";
import type { FrameworkCatalog } from "./catalog.js";
import type {
  BuilderStore,
  ChatMessage,
  ChatToolCallRecord,
  ChatToolResultRecord,
} from "./store.js";
import { applyToolCall, type ToolCall, type ToolApplyError } from "./tools.js";

export type ChatToolResult = ChatToolResultRecord;

export interface ChatTurnResult {
  readonly assistantText: string;
  readonly toolCalls: ReadonlyArray<ChatToolCallRecord>;
}

export interface ChatDriverOptions {
  store: BuilderStore;
  catalog: FrameworkCatalog;
  endpoint?: string;
  fetch?: typeof fetch;
  /**
   * Builder session ID. Sent as the `x-session-id` header on every POST so
   * the operator-action handlers (e.g. transcribe_site convert-consent
   * tracking) can correlate requests within a single browser session. When
   * absent the header is omitted and any tool that requires session
   * correlation will reject the call.
   */
  sessionId?: string | null;
}

export interface ChatApiResponse {
  text: string;
  /**
   * Server may return either the legacy shape (just name + input) or the
   * REQ-13 shape (name + input + server-side result). The driver tolerates
   * both — the client-side validator is still the validator of record
   * (REQ-8 §5.3); `result` is consumed only to surface tool_result cards.
   */
  toolCalls: Array<ToolCall & { result?: ChatToolResultRecord }>;
}

/**
 * One end-to-end chat turn:
 *   1. Append the user message to history.
 *   2. POST {history, siteDefinition, frameworkCatalog} to /api/chat.
 *   3. For each returned tool call, run applyToolCall() → validator → store.
 *   4. Append the assistant turn with structured tool-call summaries.
 *
 * The driver never throws on a validator rejection — it records the failure on
 * the chat message so the user can see what the AI tried and why it was
 * refused (DOC-8 §5.3).
 */
export async function runChatTurn(
  userText: string,
  options: ChatDriverOptions,
): Promise<ChatTurnResult> {
  const endpoint = options.endpoint ?? "/api/chat";
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const userMessage: ChatMessage = { role: "user", content: userText };
  options.store.appendChatMessage(userMessage);

  const history = options.store.getState().chatHistory;
  const siteDefinition = options.store.getState().siteDefinition;
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (options.sessionId) headers["x-session-id"] = options.sessionId;
  const resp = await fetchImpl(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      history: history.map((m) => ({ role: m.role, content: m.content })),
      siteDefinition,
      frameworkCatalog: options.catalog,
    }),
  });
  if (!resp.ok) {
    const error = `chat endpoint returned ${resp.status}`;
    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: `Sorry — ${error}.`,
    };
    options.store.appendChatMessage(assistantMessage);
    return { assistantText: assistantMessage.content, toolCalls: [] };
  }
  const data = (await resp.json()) as ChatApiResponse;

  const toolCallSummaries: ChatToolCallRecord[] = [];
  let workingSite: Site = siteDefinition;
  for (const call of data.toolCalls ?? []) {
    const serverResult = "result" in call ? call.result : undefined;
    const applyResult = applyToolCall(workingSite, options.catalog, {
      name: call.name,
      input: call.input,
    });
    if (applyResult.ok) {
      workingSite = applyResult.next;
      toolCallSummaries.push({
        name: call.name,
        input: call.input,
        accepted: true,
        ...(serverResult ? { result: serverResult } : {}),
      });
    } else {
      toolCallSummaries.push({
        name: call.name,
        input: call.input,
        accepted: false,
        error: formatError(applyResult.error),
        ...(serverResult ? { result: serverResult } : {}),
      });
    }
  }

  if (workingSite !== siteDefinition) {
    options.store.setSiteDefinition(workingSite);
  }

  const assistantMessage: ChatMessage = {
    role: "assistant",
    content: data.text ?? "",
    toolCalls: toolCallSummaries,
  };
  options.store.appendChatMessage(assistantMessage);

  return { assistantText: assistantMessage.content, toolCalls: toolCallSummaries };
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
