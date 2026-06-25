// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BuilderStore,
  buildFrameworkCatalog,
  runChatTurn,
} from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

describe("UAT AC-484: rejected AI tool call leaves site state unchanged and records a structured error in the chat log", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC484_invalid_set_module_dial_rejected_with_structured_error", async () => {
    const site = load1stContactSite();
    const store = new BuilderStore({ siteDefinition: site, chatHistory: [] });
    const catalog = buildFrameworkCatalog();

    // Target a hero instance (which declares size: [sm, md, lg] per DOC-8 §6).
    const heroInstance = site.pages[0].modules.find((m) => m.type === "hero")!;
    expect(heroInstance).toBeDefined();
    const initialDials = { ...(heroInstance.dials ?? {}) };

    // Stub /api/chat to return a set_module_dial whose value is outside the
    // declared enum — invalid per the catalog validator.
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
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
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await runChatTurn("make the hero huge", {
      store,
      catalog,
      fetch: fetchMock as unknown as typeof fetch,
    });

    // Tool-call summary marked accepted=false with a structured error message
    // naming the offending dial, the offending value, and the allowed enum.
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].accepted).toBe(false);
    const errorMessage = result.toolCalls[0].error ?? "";
    expect(errorMessage).toContain("size");
    expect(errorMessage).toContain("huge");
    expect(errorMessage).toMatch(/sm.*md.*lg/);

    // Site state unchanged — hero dials match initial.
    const after = store.getState().siteDefinition;
    const heroAfter = after.pages[0].modules.find((m) => m.id === heroInstance.id)!;
    expect(heroAfter.dials ?? {}).toEqual(initialDials);

    // Assistant message at end of chat history carries the rejected tool call.
    const lastMessage = store.getState().chatHistory.at(-1)!;
    expect(lastMessage.role).toBe("assistant");
    expect(lastMessage.toolCalls).toHaveLength(1);
    expect(lastMessage.toolCalls![0].accepted).toBe(false);
    expect(lastMessage.toolCalls![0].error).toContain("size");
    expect(lastMessage.toolCalls![0].error).toContain("huge");
  });
});
