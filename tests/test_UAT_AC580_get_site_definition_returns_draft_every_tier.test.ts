import { describe, expect, it } from "vitest";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import { buildFrameworkCatalog } from "@1stcontact/builder-ui";
import { visibleToolSpecs } from "../apps/control-app/src/operator/registry.js";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { makeAnthropicSequenceFetch } from "./_helpers_REQ-13_anthropic.js";

describe("UAT AC-580: get_site_definition read tool returns the current draft and is available on every plan tier", () => {
  it("test_UAT_AC580_get_site_definition_returns_draft_on_every_tier", async () => {
    const site = load1stContactSite();
    const original = JSON.parse(JSON.stringify(site));

    // It is a trial-tier system_action, so it is offered on trial and above —
    // never rejected on plan-tier grounds.
    for (const tier of ["trial", "paid", "enterprise"] as const) {
      expect(visibleToolSpecs(tier).map((t) => t.name)).toContain(
        "get_site_definition",
      );
    }

    // The default-trial path (no header) and the explicit trial header must
    // produce the same outcome.
    for (const planHeader of [undefined, "trial"] as const) {
      const { fetch: stubFetch, calls } = makeAnthropicSequenceFetch([
        {
          id: "msg_read",
          content: [
            {
              type: "tool_use",
              id: "toolu_read",
              name: "get_site_definition",
              input: {},
            },
          ],
        },
        {
          id: "msg_done",
          content: [{ type: "text", text: "I read the state." }],
        },
      ]);

      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      if (planHeader) headers["x-plan-tier"] = planHeader;

      const request = new Request("https://app.1stcontact.io/api/chat", {
        method: "POST",
        headers,
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
      const body = (await response.json()) as {
        systemActions: Array<{
          name: string;
          result: { status: string; payload?: { site_definition?: unknown } };
        }>;
      };

      // The read ran (not tier-rejected) and returned ok with the current
      // draft definition as its structured payload.
      const recorded = body.systemActions.find(
        (s) => s.name === "get_site_definition",
      );
      expect(recorded).toBeDefined();
      expect(recorded!.result.status).toBe("ok");
      expect(recorded!.result.payload!.site_definition).toEqual(original);

      // The tool_result fed back to the model carries the draft via applied.data
      // so the AI can verify canonical state mid-conversation.
      const lastMessage = calls[1]!.body.messages.at(-1) as {
        content: Array<{ type: string; content?: string }>;
      };
      const toolResult = lastMessage.content.find(
        (b) => b.type === "tool_result",
      )!;
      const parsed = JSON.parse(toolResult.content!) as {
        ok: boolean;
        applied?: { data?: { site_definition?: unknown } };
      };
      expect(parsed.ok).toBe(true);
      expect(parsed.applied!.data!.site_definition).toEqual(original);

      // Invoking the read does not mutate site state.
      expect(site).toEqual(original);
    }
  });
});
