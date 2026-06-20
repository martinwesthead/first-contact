import { describe, expect, it } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { makeAnthropicSequenceFetch } from "./_helpers_REQ-13_anthropic.js";
import { consumeChatSSE } from "./_helpers_REQ-36_chat_sse.js";

describe("UAT FC REQ-13: get_site_definition read tool returns the current draft site state", () => {
  it("returns the canonical draft definition the chat handler received so the AI can verify state after edits", async () => {
    const site = load1stContactSite();

    const { fetch: stubFetch, calls } = makeAnthropicSequenceFetch([
      {
        id: "msg_1",
        content: [
          {
            type: "tool_use",
            id: "toolu_read_1",
            name: "get_site_definition",
            input: {},
          },
        ],
      },
      {
        id: "msg_2",
        content: [{ type: "text", text: "I read the state." }],
      },
    ]);

    const request = new Request("https://app.1stcontact.io/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        history: [{ role: "user", content: "what does the site look like?" }],
        siteDefinition: site,
        frameworkCatalog: buildFrameworkCatalog(),
      }),
    });
    const response = await handleChatRequest(
      request,
      { CLAUDE_API_KEY: "test-key" },
      { fetch: stubFetch },
    );
    expect(response.status).toBe(200);
    const consumed = await consumeChatSSE(response);
    expect(consumed.done).not.toBeNull();
    const systemActions = consumed.done!.systemActions as Array<{
      name: string;
      result: { status: string; payload?: { site_definition?: unknown } };
    }>;

    // The handler recorded the system action and its payload includes the
    // current draft site definition.
    const recorded = systemActions.find(
      (s) => s.name === "get_site_definition",
    );
    expect(recorded).toBeDefined();
    expect(recorded!.result.status).toBe("ok");
    expect(recorded!.result.payload!.site_definition).toEqual(site);

    // The second Anthropic call's tool_result block must carry the site
    // definition as part of `applied.data` so the AI can read it.
    const blocks = calls[1]!.body.messages.at(-1) as {
      content: Array<{ type: string; content?: string }>;
    };
    const tr = blocks.content.find((b) => b.type === "tool_result")!;
    const parsed = JSON.parse(tr.content!) as {
      ok: boolean;
      applied?: { data?: { site_definition?: unknown } };
    };
    expect(parsed.ok).toBe(true);
    expect(parsed.applied!.data!.site_definition).toEqual(site);
  });
});
