// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BuilderStore,
  buildFrameworkCatalog,
  runChatTurn,
} from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

/**
 * REQ-36 G9: chat responses stream end-to-end. The chat-driver consumes
 * SSE; each `token` event appends to the in-flight assistant bubble in the
 * store, so the operator sees text growing progressively instead of a
 * block arriving on completion.
 *
 * This test drives a tiny SSE response by hand (we don't go through the
 * server here) and asserts: the assistant message is appended early,
 * grows across token events, and the final commit lands the full text +
 * any structured tool results.
 */
describe("UAT FC REQ-36: chat-driver streams assistant text progressively into the in-flight bubble", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("appends an empty assistant message at turn start, grows it on each token, finalises on done", async () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
      activeSessionId: "sess_test_REQ-36_stream",
    });
    const catalog = buildFrameworkCatalog();

    // Track the assistant bubble's content at each store emission.
    const snapshots: string[] = [];
    store.subscribe((s) => {
      const last = s.chatHistory.at(-1);
      if (last?.role === "assistant") snapshots.push(last.content);
    });

    const sseFrames = [
      `event: token`,
      `data: ${JSON.stringify({ delta: "Hello" })}`,
      ``,
      `event: token`,
      `data: ${JSON.stringify({ delta: ", " })}`,
      ``,
      `event: token`,
      `data: ${JSON.stringify({ delta: "world!" })}`,
      ``,
      `event: done`,
      `data: ${JSON.stringify({
        text: "Hello, world!",
        toolCalls: [],
        systemActions: [],
        intentToken: null,
      })}`,
      ``,
      ``,
    ].join("\n");

    const fetchMock = vi.fn(
      async () =>
        new Response(sseFrames, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
    );

    await runChatTurn("hi", {
      store,
      catalog,
      fetch: fetchMock as unknown as typeof fetch,
    });

    // The progressive snapshots must include each intermediate growth
    // step, not just the final string.
    expect(snapshots).toContain("");
    expect(snapshots).toContain("Hello");
    expect(snapshots).toContain("Hello, ");
    expect(snapshots).toContain("Hello, world!");

    // Final state.
    const final = store.getState().chatHistory.at(-1)!;
    expect(final.role).toBe("assistant");
    expect(final.content).toBe("Hello, world!");
  });

  it("surfaces an error SSE event by replacing the in-flight bubble with a sorry message", async () => {
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
      activeSessionId: "sess_test_REQ-36_stream",
    });
    const catalog = buildFrameworkCatalog();

    const sseFrames = [
      `event: error`,
      `data: ${JSON.stringify({ error: "upstream chat provider unreachable" })}`,
      ``,
      ``,
    ].join("\n");

    const fetchMock = vi.fn(
      async () =>
        new Response(sseFrames, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
    );

    const result = await runChatTurn("hi", {
      store,
      catalog,
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(result.assistantText).toContain("upstream chat provider unreachable");
    const final = store.getState().chatHistory.at(-1)!;
    expect(final.role).toBe("assistant");
    expect(final.content).toContain("upstream chat provider unreachable");
  });
});
