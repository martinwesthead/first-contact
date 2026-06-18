/**
 * Helpers for stubbing the Anthropic Messages API in REQ-13 multi-turn
 * tool-result loop tests.
 */

export interface AnthropicTextBlock {
  type: "text";
  text: string;
}

export interface AnthropicToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicToolUseBlock;

export interface AnthropicMessageResponse {
  id: string;
  content: AnthropicContentBlock[];
}

/**
 * Returns a fetch stub that emits the given sequence of Anthropic responses,
 * one per call. After the sequence is exhausted, repeats the last response.
 * The stub also captures the JSON body of every request for assertions.
 */
export function makeAnthropicSequenceFetch(
  responses: AnthropicMessageResponse[],
): {
  fetch: typeof fetch;
  calls: Array<{ body: { messages: unknown[]; system: string; tools: unknown[] } }>;
} {
  const calls: Array<{
    body: { messages: unknown[]; system: string; tools: unknown[] };
  }> = [];
  let index = 0;
  const stub = async (
    _input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const reqBody = JSON.parse(String(init?.body));
    calls.push({ body: reqBody });
    const r = responses[Math.min(index, responses.length - 1)]!;
    index++;
    return new Response(JSON.stringify(r), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { fetch: stub as unknown as typeof fetch, calls };
}
