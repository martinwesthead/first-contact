import { describe, expect, it } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { makeAnthropicSequenceFetch } from "./_helpers_REQ-13_anthropic.js";

describe("UAT FC REQ-13: a successful tool call produces a structured ok tool_result with a non-empty summary visible in the AI's next prompt", () => {
  it("emits a tool_result content block on the next turn containing {ok:true, applied:{tool, args, summary}} and feeds the working site state forward", async () => {
    const site = load1stContactSite();
    const heroInstance = site.pages[0]!.modules.find((m) => m.type === "hero")!;
    expect(heroInstance).toBeDefined();

    const { fetch: stubFetch, calls } = makeAnthropicSequenceFetch([
      {
        id: "msg_1",
        content: [
          {
            type: "tool_use",
            id: "toolu_dial_1",
            name: "set_module_dial",
            input: {
              instance_id: heroInstance.id,
              dial: "size",
              value: "lg",
            },
          },
        ],
      },
      // Second turn — Anthropic should now see the tool_result; reply with
      // just a confirmation so the loop terminates.
      {
        id: "msg_2",
        content: [{ type: "text", text: "Done — hero is now large." }],
      },
    ]);

    const request = new Request("https://app.1stcontact.io/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        history: [{ role: "user", content: "make the hero bigger" }],
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
    const body = (await response.json()) as {
      text: string;
      toolCalls: Array<{
        name: string;
        input: Record<string, unknown>;
        result: {
          ok: true;
          applied: { tool: string; args: Record<string, unknown>; summary: string };
        };
      }>;
    };

    expect(body.toolCalls).toHaveLength(1);
    const call = body.toolCalls[0]!;
    expect(call.name).toBe("set_module_dial");
    expect(call.result.ok).toBe(true);
    expect(call.result.applied.tool).toBe("set_module_dial");
    expect(call.result.applied.args).toEqual({
      instance_id: heroInstance.id,
      dial: "size",
      value: "lg",
    });
    expect(call.result.applied.summary).toMatch(/size.*lg/);
    expect(call.result.applied.summary.length).toBeGreaterThan(0);

    // The second Anthropic call must include the tool_result content block.
    expect(calls.length).toBe(2);
    const secondMessages = calls[1]!.body.messages as Array<{
      role: string;
      content: unknown;
    }>;
    const lastUserMsg = secondMessages.at(-1)!;
    expect(lastUserMsg.role).toBe("user");
    const blocks = lastUserMsg.content as Array<{
      type: string;
      tool_use_id?: string;
      content?: string;
    }>;
    expect(Array.isArray(blocks)).toBe(true);
    const trBlock = blocks.find((b) => b.type === "tool_result");
    expect(trBlock).toBeDefined();
    expect(trBlock!.tool_use_id).toBe("toolu_dial_1");
    const parsed = JSON.parse(trBlock!.content!) as {
      ok: boolean;
      applied?: { summary?: string };
    };
    expect(parsed.ok).toBe(true);
    expect(parsed.applied!.summary).toContain("lg");

    // Accumulated final assistant text reaches the FE.
    expect(body.text).toContain("Done");
  });
});
