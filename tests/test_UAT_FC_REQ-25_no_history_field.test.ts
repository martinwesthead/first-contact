// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  BuilderStore,
  buildFrameworkCatalog,
  runChatTurn,
} from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
function sseResponse(frames: string): Response {
  return new Response(frames, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

/**
 * REQ-25 wire-contract gate: the chat-driver must send
 * {sessionId, userMessage, ...} and must NOT send `history`. Verifies the
 * "in-memory-only behavior is fully gone" part of AC7 at the driver layer.
 */
describe("UAT FC REQ-25: chat-driver POSTs sessionId+userMessage, never history", () => {
  it("a turn POSTs to /api/chat with sessionId and userMessage; the body has no history field", async () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
      activeSessionId: "sess_REQ-25_wire",
    });
    const catalog = buildFrameworkCatalog();

    let capturedBody: Record<string, unknown> | null = null;
    const fetchMock = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = JSON.parse(String(init?.body ?? "{}"));
        return sseResponse(
          sseFrame("done", {
            text: "ok",
            toolCalls: [],
            systemActions: [],
            intentToken: null,
          }),
        );
      },
    );

    await runChatTurn("hello", {
      store,
      catalog,
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(capturedBody).not.toBeNull();
    expect(capturedBody!.sessionId).toBe("sess_REQ-25_wire");
    expect(capturedBody!.userMessage).toBe("hello");
    expect("history" in capturedBody!).toBe(false);
  });

  it("throws when neither chatSessionId option nor store.activeSessionId is set", async () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const catalog = buildFrameworkCatalog();

    await expect(
      runChatTurn("hi", {
        store,
        catalog,
        fetch: vi.fn() as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/no chat session id/);
  });
});
