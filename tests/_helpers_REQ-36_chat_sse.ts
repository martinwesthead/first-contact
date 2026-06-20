/**
 * Helpers for consuming the streaming /api/chat response (REQ-36 G9) in
 * tests, and for stubbing Anthropic's streaming Messages API so the chat
 * handler can be exercised without a live model.
 *
 * The chat handler now emits SSE (event: token / tool_call / tool_result /
 * done / error). Tests that previously did `await response.json()` use
 * `consumeChatSSE(response)` instead to assemble the final ChatDonePayload
 * plus the token / tool-event timelines for assertions about streaming
 * behaviour.
 */

import type { ChatDonePayload, ChatToolResult } from "../apps/control-app/src/chat.js";

export interface ChatSseToolCallEvent {
  name: string;
  input: Record<string, unknown>;
  toolUseId: string;
}

export interface ChatSseToolResultEvent {
  name: string;
  input: Record<string, unknown>;
  result: ChatToolResult;
  toolUseId: string;
}

export interface ConsumedChatStream {
  /** Concatenated text deltas in arrival order. */
  text: string;
  /** Raw token deltas, one per `token` event. */
  tokenDeltas: string[];
  /** Every `tool_call` event in order. */
  toolCallEvents: ChatSseToolCallEvent[];
  /** Every `tool_result` event in order. */
  toolResultEvents: ChatSseToolResultEvent[];
  /** Final aggregate payload from the `done` event, or null if absent. */
  done: ChatDonePayload | null;
  /** Error message from an `error` event, or null. */
  error: string | null;
}

export async function consumeChatSSE(
  response: Response,
): Promise<ConsumedChatStream> {
  const out: ConsumedChatStream = {
    text: "",
    tokenDeltas: [],
    toolCallEvents: [],
    toolResultEvents: [],
    done: null,
    error: null,
  };
  if (!response.body) return out;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep = buffer.indexOf("\n\n");
    while (sep !== -1) {
      processFrame(buffer.slice(0, sep), out);
      buffer = buffer.slice(sep + 2);
      sep = buffer.indexOf("\n\n");
    }
  }
  if (buffer.trim().length > 0) processFrame(buffer, out);
  return out;
}

function processFrame(raw: string, out: ConsumedChatStream): void {
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
      out.text += delta;
      out.tokenDeltas.push(delta);
      return;
    }
    case "tool_call":
      out.toolCallEvents.push(parsed as ChatSseToolCallEvent);
      return;
    case "tool_result":
      out.toolResultEvents.push(parsed as ChatSseToolResultEvent);
      return;
    case "done":
      out.done = parsed as ChatDonePayload;
      return;
    case "error":
      out.error = (parsed as { error?: string }).error ?? "unknown error";
      return;
    default:
      return;
  }
}

/* ------------------------------------------------------------------ *
 * Chat-driver SSE response stub                                       *
 *                                                                     *
 * Many UAT tests stub /api/chat directly (rather than going through   *
 * the real handler) — those tests now need to emit our own SSE        *
 * protocol so runChatTurn can consume it. Use makeChatSSEResponse to  *
 * build a Response whose body emits one `token` event per text chunk, *
 * one `tool_call` + `tool_result` per tool call, and a final `done`.  *
 * ------------------------------------------------------------------ */

export interface MakeChatSSEResponseInput {
  text: string;
  /** Tool calls to surface. Each gets a tool_call + tool_result event. */
  toolCalls?: Array<{
    name: string;
    input: Record<string, unknown>;
    /** Server-side result. Defaults to ok:true with a stock summary. */
    result?: ChatToolResult;
  }>;
}

export function makeChatSSEResponse(
  input: MakeChatSSEResponseInput,
): Response {
  const lines: string[] = [];
  const push = (event: string, data: unknown): void => {
    lines.push(`event: ${event}`);
    lines.push(`data: ${JSON.stringify(data)}`);
    lines.push("");
  };
  push("token", { delta: input.text });
  const allToolCalls: Array<{
    name: string;
    input: Record<string, unknown>;
    result: ChatToolResult;
  }> = [];
  for (let i = 0; i < (input.toolCalls?.length ?? 0); i++) {
    const call = input.toolCalls![i]!;
    const toolUseId = `toolu_${i}`;
    const result: ChatToolResult =
      call.result ??
      {
        ok: true,
        applied: {
          tool: call.name,
          args: call.input,
          summary: `applied ${call.name}`,
        },
      };
    push("tool_call", { name: call.name, input: call.input, toolUseId });
    push("tool_result", { name: call.name, input: call.input, result, toolUseId });
    allToolCalls.push({ name: call.name, input: call.input, result });
  }
  push("done", {
    text: input.text,
    toolCalls: allToolCalls,
    systemActions: [],
    intentToken: null,
  });
  return new Response(lines.join("\n") + "\n", {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

/* ------------------------------------------------------------------ *
 * Anthropic streaming stub                                            *
 * ------------------------------------------------------------------ */

export interface StubTextBlock {
  type: "text";
  text: string;
}

export interface StubToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export type StubContentBlock = StubTextBlock | StubToolUseBlock;

export interface StubAnthropicTurn {
  id: string;
  content: StubContentBlock[];
}

/**
 * Build an Anthropic streaming SSE response body for one turn. Mirrors the
 * real upstream protocol: content_block_start → content_block_delta+ →
 * content_block_stop per block, then a single message_stop.
 *
 * For tool_use blocks, the input is serialised as one input_json_delta with
 * the whole JSON so the parser exercise is realistic. For text blocks, the
 * text is split into ~10-char chunks so we can assert that the FE handler
 * appends them as they arrive (streaming, not block).
 */
export function encodeAnthropicSSE(turn: StubAnthropicTurn): string {
  const lines: string[] = [];
  const push = (event: string, data: unknown): void => {
    lines.push(`event: ${event}`);
    lines.push(`data: ${JSON.stringify(data)}`);
    lines.push("");
  };
  push("message_start", {
    type: "message_start",
    message: { id: turn.id, role: "assistant", content: [], usage: {} },
  });
  turn.content.forEach((block, index) => {
    if (block.type === "text") {
      push("content_block_start", {
        type: "content_block_start",
        index,
        content_block: { type: "text", text: "" },
      });
      // Chunk so we can assert progressive arrival.
      const chunkSize = 10;
      for (let i = 0; i < block.text.length; i += chunkSize) {
        push("content_block_delta", {
          type: "content_block_delta",
          index,
          delta: { type: "text_delta", text: block.text.slice(i, i + chunkSize) },
        });
      }
      push("content_block_stop", { type: "content_block_stop", index });
    } else {
      push("content_block_start", {
        type: "content_block_start",
        index,
        content_block: {
          type: "tool_use",
          id: block.id,
          name: block.name,
          input: {},
        },
      });
      push("content_block_delta", {
        type: "content_block_delta",
        index,
        delta: {
          type: "input_json_delta",
          partial_json: JSON.stringify(block.input),
        },
      });
      push("content_block_stop", { type: "content_block_stop", index });
    }
  });
  push("message_delta", {
    type: "message_delta",
    delta: { stop_reason: "end_turn" },
  });
  push("message_stop", { type: "message_stop" });
  return lines.join("\n") + "\n";
}

/**
 * Returns a fetch stub that emits the given sequence of Anthropic SSE
 * responses, one per call. After the sequence is exhausted, repeats the
 * last response.
 */
export function makeAnthropicStreamingFetch(
  turns: StubAnthropicTurn[],
): {
  fetch: typeof fetch;
  calls: Array<{
    body: {
      messages: unknown[];
      system: string;
      tools: unknown[];
      stream?: boolean;
    };
  }>;
} {
  const calls: Array<{
    body: {
      messages: unknown[];
      system: string;
      tools: unknown[];
      stream?: boolean;
    };
  }> = [];
  let index = 0;
  const stub = async (
    _input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const reqBody = JSON.parse(String(init?.body));
    calls.push({ body: reqBody });
    const t = turns[Math.min(index, turns.length - 1)]!;
    index++;
    return new Response(encodeAnthropicSSE(t), {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
  };
  return { fetch: stub as unknown as typeof fetch, calls };
}
