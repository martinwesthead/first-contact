// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BuilderStore,
  buildFrameworkCatalog,
  runChatTurn,
} from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { makeChatSSEResponse } from "./_helpers_REQ-36_chat_sse.js";

describe("UAT FC REQ-8: invalid tool call is rejected by the validator", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("rejects a set_module_dial with an out-of-enum value, leaves state unchanged, and records the structured error on the chat log", async () => {
    const site = load1stContactSite();
    const store = new BuilderStore({
      siteDefinition: site,
      chatHistory: [],
      activeSessionId: "sess_test_REQ-8_invalid",
    });
    const catalog = buildFrameworkCatalog();

    // Find a hero instance from the bundled site to target.
    const heroInstance = site.pages[0].modules.find((m) => m.type === "hero")!;
    expect(heroInstance).toBeDefined();
    const initialDials = { ...(heroInstance.dials ?? {}) };

    // Stub /api/chat to return an invalid set_module_dial:
    //   size='huge' — not in the hero's declared dial enum [sm, md, lg].
    //   (DOC-8 §5.3's `shape: 'cirle'` example is illustrative; the bundled
    //   modules don't declare a 'shape' dial. Same validator path either way.)
    const fetchMock = vi.fn(async () =>
      makeChatSSEResponse({
        text: "Trying to make the hero huge.",
        toolCalls: [
          {
            name: "set_module_dial",
            input: {
              instance_id: heroInstance.id,
              dial: "size",
              value: "huge",
            },
          },
        ],
      }),
    );

    const result = await runChatTurn("make the hero huge", {
      store,
      catalog,
      fetch: fetchMock as unknown as typeof fetch,
    });

    // Tool call recorded as rejected with structured error.
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].accepted).toBe(false);
    const errorMessage = result.toolCalls[0].error ?? "";
    expect(errorMessage).toContain("huge");
    expect(errorMessage).toContain("size");
    // Structured error should also call out the allowed enum.
    expect(errorMessage).toMatch(/sm.*md.*lg/);

    // Site state is unchanged.
    const after = store.getState().siteDefinition;
    const heroAfter = after.pages[0].modules.find((m) => m.id === heroInstance.id)!;
    expect(heroAfter.dials ?? {}).toEqual(initialDials);

    // Assistant turn appended with the rejected tool call summary.
    const lastMessage = store.getState().chatHistory.at(-1)!;
    expect(lastMessage.role).toBe("assistant");
    expect(lastMessage.toolCalls).toHaveLength(1);
    expect(lastMessage.toolCalls![0].accepted).toBe(false);
  });
});
