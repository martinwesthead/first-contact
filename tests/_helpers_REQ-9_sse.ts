export interface SseFrame {
  event: string;
  data: Record<string, unknown>;
}

/**
 * Read SSE frames from a Response body until one matches `targetEvent`, or the
 * timeout elapses. Cancels the reader on either path so the underlying stream
 * cleans up.
 *
 * SSE frames look like:
 *   event: <name>\ndata: <json>\n\n
 * with optional leading ': comment' lines we skip.
 */
export async function waitForSseFrame(
  response: Response,
  targetEvent: string,
  timeoutMs: number,
): Promise<SseFrame> {
  if (!response.body) {
    throw new Error("response has no body");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const deadline = Promise.race([
    (async (): Promise<SseFrame> => {
      while (true) {
        const { value, done } = await reader.read();
        if (done) throw new Error(`SSE stream closed before '${targetEvent}'`);
        buffer += decoder.decode(value, { stream: true });
        let idx = buffer.indexOf("\n\n");
        while (idx >= 0) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const parsed = parseFrame(frame);
          if (parsed && parsed.event === targetEvent) {
            return parsed;
          }
          idx = buffer.indexOf("\n\n");
        }
      }
    })(),
    new Promise<SseFrame>((_, reject) =>
      setTimeout(
        () => reject(new Error(`timeout waiting for '${targetEvent}' after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);
  try {
    return await deadline;
  } finally {
    try {
      await reader.cancel();
    } catch {
      // ignore
    }
  }
}

function parseFrame(raw: string): SseFrame | null {
  let event: string | null = null;
  let dataLine: string | null = null;
  for (const line of raw.split("\n")) {
    if (line.startsWith(":")) continue; // comment / heartbeat
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      dataLine = line.slice("data:".length).trim();
    }
  }
  if (!event || dataLine === null) return null;
  let data: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(dataLine);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      data = parsed as Record<string, unknown>;
    }
  } catch {
    // leave data empty
  }
  return { event, data };
}
