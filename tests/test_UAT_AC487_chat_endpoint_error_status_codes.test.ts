import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { consumeChatSSE } from "./_helpers_REQ-36_chat_sse.js";
import { seedChatSession, type SeededChatEnv } from "./_helpers_REQ-24_chat.js";

/**
 * AC-487 (server-resident contract): the chat endpoint's failure taxonomy.
 * Configuration faults are surfaced before the SSE stream opens — a missing
 * CLAUDE_API_KEY is a synchronous 500. Upstream provider faults, by contrast,
 * happen AFTER the 200 stream has opened, so they are surfaced as an in-stream
 * `error` SSE event (the response status is still 200 and no `done` event is
 * emitted) — both a transport throw and a non-2xx upstream status.
 */
describe("UAT AC-487: missing key is a synchronous 500; upstream faults surface as an in-stream error event on a 200 stream", () => {
  let env: SeededChatEnv;

  beforeAll(async () => {
    env = await seedChatSession({ sessionId: "sess_ac487" });
  });

  afterAll(async () => {
    await env.cleanup();
  });

  const makeRequest = (): Request =>
    new Request("https://app.1stcontact.io/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: env.sessionId,
        userMessage: "hi",
        siteDefinition: load1stContactSite(),
        frameworkCatalog: buildFrameworkCatalog(),
      }),
    });

  it("test_UAT_AC487_missing_key_500_then_upstream_throw_and_non_ok_surface_in_stream_errors", async () => {
    // Case 1: no CLAUDE_API_KEY → synchronous 500 naming CLAUDE_API_KEY (the
    // stream never opens, so this is a real HTTP error, not an SSE event).
    const noKeyResponse = await handleChatRequest(
      makeRequest(),
      { SITES_DB: env.db },
      {},
    );
    expect(noKeyResponse.status).toBe(500);
    const noKeyBody = (await noKeyResponse.json()) as { error: string };
    expect(noKeyBody.error).toMatch(/CLAUDE_API_KEY/);

    // Case 2: key bound, upstream fetch throws (transport failure). The stream
    // is already open (200), so the failure is re-emitted as an `error` event
    // and no `done` event fires.
    const throwFetch = vi.fn(async () => {
      throw new Error("network down");
    });
    const throwResponse = await handleChatRequest(
      makeRequest(),
      { CLAUDE_API_KEY: "test-key-abc", SITES_DB: env.db },
      { fetch: throwFetch as unknown as typeof fetch, log: () => {} },
    );
    expect(throwResponse.status).toBe(200);
    const throwConsumed = await consumeChatSSE(throwResponse);
    expect(throwConsumed.done).toBeNull();
    expect(throwConsumed.error).not.toBeNull();
    expect(throwConsumed.error!.length).toBeGreaterThan(0);
    expect(throwConsumed.error!).toMatch(/unreachable/i);

    // Case 3: key bound, upstream returns a non-2xx (503) → again an in-stream
    // `error` event naming the upstream status, on a 200 stream.
    const nonOkFetch = vi.fn(async () =>
      new Response("upstream busy", {
        status: 503,
        headers: { "content-type": "text/plain" },
      }),
    );
    const nonOkResponse = await handleChatRequest(
      makeRequest(),
      { CLAUDE_API_KEY: "test-key-abc", SITES_DB: env.db },
      { fetch: nonOkFetch as unknown as typeof fetch, log: () => {} },
    );
    expect(nonOkResponse.status).toBe(200);
    const nonOkConsumed = await consumeChatSSE(nonOkResponse);
    expect(nonOkConsumed.done).toBeNull();
    expect(nonOkConsumed.error).not.toBeNull();
    expect(nonOkConsumed.error!).toContain("503");
  });
});
