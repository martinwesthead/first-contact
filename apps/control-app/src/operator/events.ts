export type SseEventType =
  | "chat:append"
  | "state:diff"
  | "state:invalidate"
  | "action:notify"
  | "validation:error";

export interface SseEvent {
  readonly event: SseEventType;
  readonly data: Record<string, unknown>;
}

type Subscriber = (event: SseEvent) => void;

class SessionEventBus {
  private readonly subs = new Map<string, Set<Subscriber>>();

  subscribe(sessionId: string, fn: Subscriber): () => void {
    let set = this.subs.get(sessionId);
    if (!set) {
      set = new Set();
      this.subs.set(sessionId, set);
    }
    set.add(fn);
    return () => {
      const current = this.subs.get(sessionId);
      if (!current) return;
      current.delete(fn);
      if (current.size === 0) this.subs.delete(sessionId);
    };
  }

  publish(sessionId: string, event: SseEvent): void {
    const set = this.subs.get(sessionId);
    if (!set) return;
    for (const fn of set) fn(event);
  }

  subscriberCount(sessionId: string): number {
    return this.subs.get(sessionId)?.size ?? 0;
  }
}

// Module-level singleton. Workers isolates may not share state across requests
// on different machines; this stub works because tests + dev run a single
// isolate. Production graduation to Durable Objects is a follow-up REQ.
export const sessionEventBus = new SessionEventBus();

export function formatSseFrame(event: SseEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

export function handleSseEndpoint(request: Request): Response {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) {
    return new Response(
      JSON.stringify({ error: "session_id query param required" }),
      {
        status: 400,
        headers: { "content-type": "application/json; charset=utf-8" },
      },
    );
  }
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const safeEnqueue = (bytes: Uint8Array): void => {
        if (closed) return;
        try {
          controller.enqueue(bytes);
        } catch {
          closed = true;
        }
      };
      const unsub = sessionEventBus.subscribe(sessionId, (event) => {
        safeEnqueue(encoder.encode(formatSseFrame(event)));
      });
      // Initial comment frame so the client knows the channel is open.
      safeEnqueue(encoder.encode(`: connected ${sessionId}\n\n`));
      request.signal.addEventListener("abort", () => {
        closed = true;
        unsub();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      // Subscriber cleanup handled via the abort signal path; cancel is a
      // belt-and-braces hook for streams closed without an abort.
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
