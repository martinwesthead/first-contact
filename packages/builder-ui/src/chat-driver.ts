import type { Site } from "@1stcontact/site-schema";
import type { FrameworkCatalog } from "./catalog.js";
import type { BuilderStore, ChatMessage } from "./store.js";
import { applyToolCall, type ToolCall, type ToolApplyError } from "./tools.js";

export interface ChatTurnResult {
  readonly assistantText: string;
  readonly toolCalls: ReadonlyArray<{
    readonly name: string;
    readonly input: Record<string, unknown>;
    readonly accepted: boolean;
    readonly error?: string;
  }>;
}

export interface ChatDriverOptions {
  store: BuilderStore;
  catalog: FrameworkCatalog;
  endpoint?: string;
  fetch?: typeof fetch;
}

export interface ChatApiResponse {
  text: string;
  toolCalls: ToolCall[];
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
  const resp = await fetchImpl(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
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

  const toolCallSummaries: Array<{
    name: string;
    input: Record<string, unknown>;
    accepted: boolean;
    error?: string;
  }> = [];
  let workingSite: Site = siteDefinition;
  for (const call of data.toolCalls ?? []) {
    const result = applyToolCall(workingSite, options.catalog, call);
    if (result.ok) {
      workingSite = result.next;
      toolCallSummaries.push({
        name: call.name,
        input: call.input,
        accepted: true,
      });
    } else {
      toolCallSummaries.push({
        name: call.name,
        input: call.input,
        accepted: false,
        error: formatError(result.error),
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
