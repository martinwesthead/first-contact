// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BuilderStore,
  buildFrameworkCatalog,
  runChatTurn,
} from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

/**
 * AC-730: assistant responses stream progressively. At turn start an empty
 * assistant bubble is appended and grows as each `token` SSE event arrives;
 * on `done` it commits the final text. A stream `error` event (or a non-2xx
 * response) replaces the in-flight bubble with a `Sorry — …` message.
 */
describe("UAT AC-730: assistant responses stream progressively; an error event surfaces a sorry-message bubble", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC730_streams_progressively_then_errors_surface_sorry", async () => {
    const catalog = buildFrameworkCatalog();

    // --- Progressive growth: token events grow the in-flight bubble --------
    const store = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });

    // Capture the assistant bubble's content on each store emission.
    const snapshots: string[] = [];
    store.subscribe((s) => {
      const last = s.chatHistory.at(-1);
      if (last?.role === "assistant") snapshots.push(last.content);
    });

    const okFrames = [
      `event: token`,
      `data: ${JSON.stringify({ delta: "Hel" })}`,
      ``,
      `event: token`,
      `data: ${JSON.stringify({ delta: "lo" })}`,
      ``,
      `event: token`,
      `data: ${JSON.stringify({ delta: ", world!" })}`,
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

    const okFetch = vi.fn(
      async () =>
        new Response(okFrames, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
    );

    await runChatTurn("hi", {
      store,
      catalog,
      fetch: okFetch as unknown as typeof fetch,
    });

    // The bubble appeared early and lengthened across token events (it is not
    // a single block that only materialises at done).
    expect(snapshots).toContain("");
    expect(snapshots).toContain("Hel");
    expect(snapshots).toContain("Hello");
    expect(snapshots).toContain("Hello, world!");
    // Strictly growing prefix sequence (each snapshot starts the next).
    const distinct = snapshots.filter((v, i) => i === 0 || v !== snapshots[i - 1]);
    expect(distinct.length).toBeGreaterThan(1);
    expect(store.getState().chatHistory.at(-1)!.content).toBe("Hello, world!");

    // --- Error event: in-flight bubble replaced with a sorry message -------
    const storeErr = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const errFrames = [
      `event: error`,
      `data: ${JSON.stringify({ error: "upstream chat provider unreachable" })}`,
      ``,
      ``,
    ].join("\n");
    const errFetch = vi.fn(
      async () =>
        new Response(errFrames, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
    );
    await runChatTurn("hi", {
      store: storeErr,
      catalog,
      fetch: errFetch as unknown as typeof fetch,
    });
    const errLast = storeErr.getState().chatHistory.at(-1)!;
    expect(errLast.role).toBe("assistant");
    expect(errLast.content).toContain("Sorry");
    expect(errLast.content).toContain("upstream chat provider unreachable");

    // --- Non-2xx response: also a sorry bubble -----------------------------
    const storeHttp = new BuilderStore({
      siteDefinition: load1stContactSite(),
      chatHistory: [],
    });
    const httpFetch = vi.fn(
      async () =>
        new Response("upstream busy", {
          status: 502,
          headers: { "content-type": "text/plain" },
        }),
    );
    await runChatTurn("hi", {
      store: storeHttp,
      catalog,
      fetch: httpFetch as unknown as typeof fetch,
    });
    const httpLast = storeHttp.getState().chatHistory.at(-1)!;
    expect(httpLast.role).toBe("assistant");
    expect(httpLast.content).toContain("Sorry");
  });
});
