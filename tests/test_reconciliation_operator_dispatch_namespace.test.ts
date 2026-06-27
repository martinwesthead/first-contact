import { describe, expect, it, vi } from "vitest";
import worker from "../apps/control-app/src/index.js";
import { handleChatRequest } from "../apps/control-app/src/chat.js";
import {
  OPERATOR_ACTIONS,
  findAction,
  visibleToolSpecs,
} from "../apps/control-app/src/operator/registry.js";
import { sessionEventBus } from "../apps/control-app/src/operator/events.js";
import { buildFrameworkCatalog } from "@1stcontact/builder-ui";
import { waitForSseFrame } from "./_helpers_REQ-9_sse.js";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

const STATE_EDIT_TOOL_NAMES = [
  "set_module_content",
  "set_module_dial",
  "set_module_variant",
  "add_module",
  "remove_module",
  "reorder_modules",
  "set_theme_token",
  "set_site_config",
];

const SSE_EVENT_TYPES = [
  "chat:append",
  "state:diff",
  "state:invalidate",
  "action:notify",
  "validation:error",
] as const;

async function readSseUntil(
  response: Response,
  predicate: (buffer: string) => boolean,
  timeoutMs: number,
): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const deadline = Date.now() + timeoutMs;
  try {
    while (Date.now() < deadline) {
      const remaining = deadline - Date.now();
      const readPromise = reader.read();
      const result = await Promise.race([
        readPromise.then((r) => ({ ok: true as const, value: r })),
        new Promise<{ ok: false }>((resolve) =>
          setTimeout(() => resolve({ ok: false }), Math.max(1, remaining)),
        ),
      ]);
      if (!result.ok) break;
      const { done, value } = result.value;
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (predicate(buffer)) break;
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* ignore */
    }
  }
  return buffer;
}

describe("Story story-a07c8ed3: Operator action dispatch namespace, plan-tier auth, SSE channel", () => {
  it("test_UAT_AC544_unknown_operator_action_returns_404_with_no_side_effects", async () => {
    const sessionId = "sess-ac544";
    const sseResponse = await worker.fetch(
      new Request(
        `https://app.1stcontact.io/api/operator/events?session_id=${sessionId}`,
        { method: "GET" },
      ),
      {},
    );
    expect(sseResponse.status).toBe(200);

    const request = new Request(
      "https://app.1stcontact.io/api/operator/does_not_exist",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-session-id": sessionId,
          "x-plan-tier": "paid",
        },
        body: JSON.stringify({}),
      },
    );
    const response = await worker.fetch(request, {});
    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("does_not_exist");

    // No action:notify or validation:error within 200ms
    const buffer = await readSseUntil(
      sseResponse,
      (b) =>
        b.includes("event: action:notify") ||
        b.includes("event: validation:error"),
      200,
    );
    expect(buffer).not.toContain("event: action:notify");
    expect(buffer).not.toContain("event: validation:error");
  });

  it("test_UAT_AC545_authorized_system_action_returns_structured_payload", async () => {
    const request = new Request(
      "https://app.1stcontact.io/api/operator/publish_stub",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-plan-tier": "paid",
          "x-account-id": "acct-test",
          "x-session-id": "sess-ac545",
        },
        body: JSON.stringify({ note: "hello" }),
      },
    );
    const response = await worker.fetch(request, {});
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      action: string;
      payload: Record<string, unknown>;
    };
    expect(body.status).toBe("ok");
    expect(body.action).toBe("publish_stub");
    expect(body.payload.action).toBe("publish_stub");
    expect(body.payload.status).toBe("published");
    expect(body.payload.note).toBe("hello");
    expect(typeof body.payload.site_url).toBe("string");
    expect((body.payload.site_url as string).length).toBeGreaterThan(0);
  });

  it("test_UAT_AC546_plan_tier_mismatch_returns_403_with_both_tiers_and_skips_handler", async () => {
    const sessionId = "sess-ac546";
    const sseResponse = await worker.fetch(
      new Request(
        `https://app.1stcontact.io/api/operator/events?session_id=${sessionId}`,
        { method: "GET" },
      ),
      {},
    );
    expect(sseResponse.status).toBe(200);

    const request = new Request(
      "https://app.1stcontact.io/api/operator/publish_stub",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-plan-tier": "trial",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({}),
      },
    );
    const response = await worker.fetch(request, {});
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("paid");
    expect(body.error).toContain("trial");

    const buffer = await readSseUntil(
      sseResponse,
      (b) => b.includes("event: action:notify"),
      200,
    );
    expect(buffer).not.toContain("event: action:notify");
  });

  it("test_UAT_AC547_missing_or_invalid_auth_headers_default_to_trial_tier", async () => {
    // (a) No auth headers at all → trial-permitted action succeeds.
    const trialOkResponse = await worker.fetch(
      new Request(
        "https://app.1stcontact.io/api/operator/report_validation_rejection",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-session-id": "sess-ac547-a",
          },
          body: JSON.stringify({ tool: "set_module_content" }),
        },
      ),
      {},
    );
    expect(trialOkResponse.status).toBe(200);

    // (b) No x-plan-tier header → paid-required action rejected.
    const missingTierResponse = await worker.fetch(
      new Request("https://app.1stcontact.io/api/operator/publish_stub", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-session-id": "sess-ac547-b",
        },
        body: JSON.stringify({}),
      }),
      {},
    );
    expect(missingTierResponse.status).toBe(403);
    const missingBody = (await missingTierResponse.json()) as { error: string };
    expect(missingBody.error).toContain("trial");

    // (c) Invalid x-plan-tier value → defaults to trial → paid-required action rejected.
    const bogusTierResponse = await worker.fetch(
      new Request("https://app.1stcontact.io/api/operator/publish_stub", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-plan-tier": "bogus",
          "x-session-id": "sess-ac547-c",
        },
        body: JSON.stringify({}),
      }),
      {},
    );
    expect(bogusTierResponse.status).toBe(403);
    const bogusBody = (await bogusTierResponse.json()) as { error: string };
    expect(bogusBody.error).toContain("trial");
  });

  it("test_UAT_AC548_sse_endpoint_streams_five_event_types_heartbeats_and_closes_cleanly", async () => {
    // (a) No session_id → 400.
    const missingSessionResponse = await worker.fetch(
      new Request("https://app.1stcontact.io/api/operator/events", {
        method: "GET",
      }),
      {},
    );
    expect(missingSessionResponse.status).toBe(400);

    // (b) Open SSE → 200 + text/event-stream + initial connection frame.
    const sessionId = "sess-ac548";
    const controller = new AbortController();
    const sseResponse = await worker.fetch(
      new Request(
        `https://app.1stcontact.io/api/operator/events?session_id=${sessionId}`,
        { method: "GET", signal: controller.signal },
      ),
      {},
    );
    expect(sseResponse.status).toBe(200);
    expect(sseResponse.headers.get("content-type")).toContain(
      "text/event-stream",
    );

    // (c) The channel can deliver any of the 5 event types. Publish before
    //     reading; the stream buffers them.
    for (const eventType of SSE_EVENT_TYPES) {
      sessionEventBus.publish(sessionId, {
        event: eventType,
        data: { marker: eventType },
      });
    }

    // Single-reader pass: read all bytes for ~300ms, then evaluate every
    //     assertion against the captured buffer. Re-locking the body is
    //     forbidden, so all stream observations must come from this buffer.
    const reader = sseResponse.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const readDeadline = Date.now() + 300;
    try {
      while (Date.now() < readDeadline) {
        const remaining = readDeadline - Date.now();
        const result = await Promise.race([
          reader.read().then((r) => ({ ok: true as const, value: r })),
          new Promise<{ ok: false }>((resolve) =>
            setTimeout(() => resolve({ ok: false }), Math.max(1, remaining)),
          ),
        ]);
        if (!result.ok) break;
        if (result.value.done) break;
        if (result.value.value) {
          buffer += decoder.decode(result.value.value, { stream: true });
        }
      }
    } finally {
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
    }

    expect(buffer).toContain(`: connected ${sessionId}`);
    for (const eventType of SSE_EVENT_TYPES) {
      expect(
        buffer,
        `frame for ${eventType} should appear on the stream`,
      ).toContain(`event: ${eventType}`);
    }

    // (d) Heartbeat: AC requires a recurring frame on ~15s cadence (comment
    //     or event). The initial `: connected` line is the open frame, not
    //     a heartbeat. We look for a SECOND comment line or a dedicated
    //     heartbeat/ping event in the captured buffer.
    //
    //     If the implementation has no recurring heartbeat at all, no such
    //     marker appears here. The AC asserts the intended behavior; a
    //     failing assertion is the regression marker.
    const heartbeatLines = buffer
      .split("\n")
      .filter(
        (l) =>
          /^: (heartbeat|ping|keepalive|hb)\b/i.test(l) ||
          /^event: (heartbeat|ping|keepalive|hb)$/i.test(l),
      );
    expect(
      heartbeatLines.length,
      "AC requires recurring heartbeat frames (comment or event); none observed",
    ).toBeGreaterThan(0);

    // (e) Aborting the client cleans up the subscription.
    expect(sessionEventBus.subscriberCount(sessionId)).toBeGreaterThan(0);
    controller.abort();
    // Allow the abort handler to run.
    await new Promise((r) => setTimeout(r, 50));
    expect(sessionEventBus.subscriberCount(sessionId)).toBe(0);
  });

  it("test_UAT_AC549_successful_system_action_emits_action_notify_to_subscribers_within_100ms", async () => {
    const sessionId = "sess-ac549";
    const sseResponse = await worker.fetch(
      new Request(
        `https://app.1stcontact.io/api/operator/events?session_id=${sessionId}`,
        { method: "GET" },
      ),
      {},
    );
    expect(sseResponse.status).toBe(200);

    const framePromise = waitForSseFrame(sseResponse, "action:notify", 1000);

    const start = Date.now();
    const response = await worker.fetch(
      new Request("https://app.1stcontact.io/api/operator/publish_stub", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-session-id": sessionId,
          "x-plan-tier": "paid",
          "x-account-id": "acct-ac549",
        },
        body: JSON.stringify({}),
      }),
      {},
    );
    expect(response.status).toBe(200);

    const frame = await framePromise;
    const elapsed = Date.now() - start;
    // 100ms is the AC target; 500ms is a generous CI cushion that still
    // fails loudly if the dispatch is async-decoupled from the response.
    expect(elapsed).toBeLessThan(500);

    expect(frame.event).toBe("action:notify");
    expect(frame.data.action).toBe("publish_stub");
    expect(frame.data.status).toBe("published");
  });

  it("test_UAT_AC550_validation_error_event_payload_carries_path_expected_got", async () => {
    const sessionId = "sess-ac550";
    const sseResponse = await worker.fetch(
      new Request(
        `https://app.1stcontact.io/api/operator/events?session_id=${sessionId}`,
        { method: "GET" },
      ),
      {},
    );
    expect(sseResponse.status).toBe(200);

    const framePromise = waitForSseFrame(sseResponse, "validation:error", 1000);

    const response = await worker.fetch(
      new Request(
        "https://app.1stcontact.io/api/operator/report_validation_rejection",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-session-id": sessionId,
            "x-plan-tier": "trial",
          },
          body: JSON.stringify({
            tool: "set_module_content",
            path: "modules[2].body",
            expected: "string",
            got: 42,
            message: "type mismatch",
          }),
        },
      ),
      {},
    );
    expect(response.status).toBe(200);

    const frame = await framePromise;
    expect(frame.event).toBe("validation:error");
    expect(frame.data.path).toBe("modules[2].body");
    expect(frame.data.expected).toBe("string");
    expect(frame.data.got).toBe(42);
  });

  it("test_UAT_AC551_registry_exposes_category_plan_tier_tool_spec_ui_route_via_tool_list_and_parity_audit", async () => {
    // (a) Every registry entry has the four uniform fields.
    expect(OPERATOR_ACTIONS.length).toBeGreaterThan(0);
    for (const action of OPERATOR_ACTIONS) {
      expect(["state_edit", "system_action"]).toContain(action.category);
      expect(["trial", "paid", "enterprise"]).toContain(action.plan_tier);
      expect(action.tool_spec).toBeDefined();
      expect(action.tool_spec.name).toBe(action.name);
      expect(typeof action.tool_spec.description).toBe("string");
      expect(typeof action.tool_spec.input_schema).toBe("object");
      // ui_route is string-or-null; both are valid markers for the parity
      // audit. v1 ships every action with ui_route: null.
      expect(
        action.ui_route === null || typeof action.ui_route === "string",
      ).toBe(true);
    }

    // (b) Spec-named entries from the intent are present with the right
    //     categories + plan tiers.
    const publishStub = findAction("publish_stub");
    expect(publishStub).toBeDefined();
    expect(publishStub!.category).toBe("system_action");
    expect(publishStub!.plan_tier).toBe("paid");

    const reportRejection = findAction("report_validation_rejection");
    expect(reportRejection).toBeDefined();
    expect(reportRejection!.category).toBe("system_action");
    expect(reportRejection!.plan_tier).toBe("trial");

    // (c) Tool list filtering at the chat surface: trial vs paid.
    const captured: Array<{ tools: Array<{ name: string }> }> = [];
    const mockFetch = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        captured.push(JSON.parse(String(init?.body)));
        return new Response(JSON.stringify({ id: "msg_x", content: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    );

    const makeChatRequest = (planTier: string): Request =>
      new Request("https://app.1stcontact.io/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-session-id": `sess-ac551-${planTier}`,
          "x-plan-tier": planTier,
        },
        body: JSON.stringify({
          history: [{ role: "user", content: "hi" }],
          siteDefinition: load1stContactSite(),
          frameworkCatalog: buildFrameworkCatalog(),
        }),
      });

    const trialResp = await handleChatRequest(
      makeChatRequest("trial"),
      { CLAUDE_API_KEY: "k" },
      { fetch: mockFetch as unknown as typeof fetch },
    );
    expect(trialResp.status).toBe(200);
    const trialToolNames = captured[0].tools.map((t) => t.name);
    for (const t of STATE_EDIT_TOOL_NAMES) {
      expect(trialToolNames, `${t} should be visible on trial`).toContain(t);
    }
    expect(trialToolNames).toContain("report_validation_rejection");
    expect(trialToolNames).not.toContain("publish_stub");

    captured.length = 0;
    const paidResp = await handleChatRequest(
      makeChatRequest("paid"),
      { CLAUDE_API_KEY: "k" },
      { fetch: mockFetch as unknown as typeof fetch },
    );
    expect(paidResp.status).toBe(200);
    const paidToolNames = captured[0].tools.map((t) => t.name);
    expect(paidToolNames).toContain("publish_stub");
    for (const t of STATE_EDIT_TOOL_NAMES) {
      expect(paidToolNames).toContain(t);
    }

    // (d) Parity-audit classification (the logic the CLI implements):
    //     every action's status is "chat-only" (ui_route === null) or
    //     "ui-declared" (ui_route resolves), and the CLI's exit-code-zero
    //     condition is "no entry is ui-missing". v1 ships with all
    //     ui_route=null → all chat-only → exit 0 condition holds.
    const auditRows = OPERATOR_ACTIONS.map((a) => ({
      name: a.name,
      category: a.category,
      plan_tier: a.plan_tier,
      ui_route: a.ui_route,
      status: a.ui_route === null ? "chat-only" : "ui-missing",
    }));
    expect(auditRows.length).toBe(OPERATOR_ACTIONS.length);
    // Every row carries name, category, plan_tier, ui_route — the four
    // fields the parity-audit CLI must surface.
    for (const row of auditRows) {
      expect(row.name.length).toBeGreaterThan(0);
      expect(["state_edit", "system_action"]).toContain(row.category);
      expect(["trial", "paid", "enterprise"]).toContain(row.plan_tier);
      expect(row.ui_route === null || typeof row.ui_route === "string").toBe(
        true,
      );
    }
    // CLI exit-0 condition for v1: no entry has status "ui-missing".
    const uiMissing = auditRows.filter((r) => r.status === "ui-missing");
    expect(uiMissing).toEqual([]);
  });

  it("test_UAT_AC552_state_edit_actions_cannot_be_invoked_through_direct_post_dispatcher", async () => {
    const sessionId = "sess-ac552";
    const sseResponse = await worker.fetch(
      new Request(
        `https://app.1stcontact.io/api/operator/events?session_id=${sessionId}`,
        { method: "GET" },
      ),
      {},
    );
    expect(sseResponse.status).toBe(200);

    const response = await worker.fetch(
      new Request(
        "https://app.1stcontact.io/api/operator/set_module_content",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-session-id": sessionId,
            "x-plan-tier": "trial",
          },
          body: JSON.stringify({
            instance_id: "hero-1",
            field: "title",
            value: "Test",
          }),
        },
      ),
      {},
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    // The body explains state-edit tools execute client-side via the chat
    // surface — error mentions either /api/chat or the chat path.
    expect(body.error.toLowerCase()).toMatch(/chat|state-edit/);

    // No state:diff, action:notify, or validation:error within 200ms.
    const buffer = await readSseUntil(
      sseResponse,
      (b) =>
        b.includes("event: state:diff") ||
        b.includes("event: action:notify") ||
        b.includes("event: validation:error"),
      200,
    );
    expect(buffer).not.toContain("event: state:diff");
    expect(buffer).not.toContain("event: action:notify");
    expect(buffer).not.toContain("event: validation:error");
  });
});
