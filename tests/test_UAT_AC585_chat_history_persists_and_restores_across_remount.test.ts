// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BuilderStore,
  buildFrameworkCatalog,
  runChatTurn,
} from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";
import { makeChatSSEResponse } from "./_helpers_REQ-36_chat_sse.js";

/**
 * AC-585: chat-turn history is persisted to browser storage after every
 * turn (user message + assistant turn, including the structured outcome of
 * accepted/rejected tool calls) and restored when the builder is re-mounted
 * against the same storage. REQ-36 switched /api/chat to SSE, so the driver
 * is exercised with streamed (token/tool_call/tool_result/done) responses.
 */
describe("UAT AC-585: chat-turn history is persisted to browser storage and restored on builder re-mount", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC585_chat_history_persisted_and_restored_with_accepted_and_rejected_turns", async () => {
    const storage = new MemoryStorage();
    const catalog = buildFrameworkCatalog();
    const site = load1stContactSite();

    // A hero instance gives us a dial whose value we can drive out-of-enum to
    // produce a *rejected* tool call (DOC-8 §6 — size: [sm, md, lg]).
    const heroInstance = site.pages[0].modules.find((m) => m.type === "hero")!;
    expect(heroInstance).toBeDefined();

    // First builder: empty chat history, backed by the shared storage.
    const first = new BuilderStore(
      { siteDefinition: site, chatHistory: [] },
      { storage },
    );

    // Turn 1 — accepted set_theme_token. Turn 2 — rejected set_module_dial
    // (value outside the declared enum). Both delivered as SSE.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makeChatSSEResponse({
          text: "Primary set to pink.",
          toolCalls: [
            {
              name: "set_theme_token",
              input: { name: "palette.primary", value: "#ff0099" },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        makeChatSSEResponse({
          text: "Trying to make the hero huge.",
          toolCalls: [
            {
              name: "set_module_dial",
              input: { instance_id: heroInstance.id, dial: "size", value: "huge" },
            },
          ],
        }),
      );

    await runChatTurn("make the primary color pink", {
      store: first,
      catalog,
      fetch: fetchMock as unknown as typeof fetch,
    });
    await runChatTurn("make the hero huge", {
      store: first,
      catalog,
      fetch: fetchMock as unknown as typeof fetch,
    });

    // Working chat log has four turns.
    const liveHistory = first.getState().chatHistory;
    expect(liveHistory).toHaveLength(4);
    expect(liveHistory.map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "user",
      "assistant",
    ]);
    expect(liveHistory[1].toolCalls?.[0].accepted).toBe(true);
    expect(liveHistory[3].toolCalls?.[0].accepted).toBe(false);

    // Storage now holds a serialised chat-turn history under the chat key.
    const persistedChat = storage.getItem("1stcontact_builder_site_v1_chat");
    expect(persistedChat).toBeTruthy();
    const parsedChat = JSON.parse(persistedChat!) as Array<unknown>;
    expect(parsedChat).toHaveLength(4);

    // Discard the builder; mount a fresh one against the same storage with an
    // empty initial chat history. It hydrates from storage — not empty —
    // preserving order and accepted/rejected outcomes.
    const reloaded = new BuilderStore(
      { siteDefinition: load1stContactSite(), chatHistory: [] },
      { storage },
    );

    const restored = reloaded.getState().chatHistory;
    expect(restored).toHaveLength(4);
    expect(restored.map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "user",
      "assistant",
    ]);
    expect(restored[0].content).toBe("make the primary color pink");
    expect(restored[2].content).toBe("make the hero huge");
    expect(restored[1].toolCalls?.[0].accepted).toBe(true);
    expect(restored[1].toolCalls?.[0].name).toBe("set_theme_token");
    expect(restored[3].toolCalls?.[0].accepted).toBe(false);
    expect(restored[3].toolCalls?.[0].error ?? "").toContain("size");
    expect(restored[3].toolCalls?.[0].error ?? "").toContain("huge");
  });
});
