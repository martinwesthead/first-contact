import { afterEach, describe, expect, it, vi } from "vitest";
import { findAction } from "../apps/control-app/src/operator/registry.js";
import type { ActionContext } from "../apps/control-app/src/operator/registry.js";

function makeCtx(env: {
  DEV_TOOLS_ENABLED?: string;
  DEV_TOOLS_URL?: string;
} = { DEV_TOOLS_ENABLED: "true" }): ActionContext {
  return {
    session: { session_id: "s1", account_id: "acct-r46", plan_tier: "trial" },
    env: env as unknown as ActionContext["env"],
    emit: vi.fn(),
    siteDefinition: null,
    operatorLastMessage: null,
    requestOrigin: null,
  };
}

describe("UAT FC REQ-46: xgd_ticket handler routes valid calls to the sidecar and surfaces its result", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs {command:'create', args:[...]} as JSON to the configured sidecar URL", async () => {
    const sidecarResponse = {
      ok: true,
      stdout: "Created ticket TASK-99 (task-abc)",
      stderr: "",
      exitCode: 0,
    };
    const fetchSpy = vi.fn(
      async (
        _url: string,
        _init?: RequestInit,
      ) =>
        new Response(JSON.stringify(sidecarResponse), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const action = findAction("xgd_ticket");
    expect(action?.handler).toBeDefined();
    const result = await action!.handler!(
      { command: "create", args: ["--type", "task", "--title", "Demo"] },
      makeCtx(),
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("http://127.0.0.1:7878/xgd-ticket");
    expect(init!.method).toBe("POST");
    const headers = init!.headers as Record<string, string>;
    expect(headers["content-type"]).toBe("application/json");
    expect(JSON.parse(init!.body as string)).toEqual({
      command: "create",
      args: ["--type", "task", "--title", "Demo"],
    });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      // Sidecar fields survive verbatim …
      expect(result.payload!.ok).toBe(true);
      expect(result.payload!.stdout).toBe(sidecarResponse.stdout);
      expect(result.payload!.stderr).toBe(sidecarResponse.stderr);
      expect(result.payload!.exitCode).toBe(0);
      // … plus a kind tag so chat.ts surfaces the payload to the AI's next
      // turn (otherwise the system-action dispatcher only sends the summary
      // string, and the AI can't read the stdout it just fetched).
      expect(result.payload!.kind).toBe("xgd_ticket_result");
      expect(result.payload!.command).toBe("create");
      expect(result.payload!.args).toEqual([
        "--type",
        "task",
        "--title",
        "Demo",
      ]);
    }
  });

  it("omits 'args' from the sidecar body when caller did not supply one", async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ ok: true, stdout: "", stderr: "", exitCode: 0 }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const action = findAction("xgd_ticket");
    await action!.handler!({ command: "list" }, makeCtx());

    const [, init] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse(init!.body as string);
    expect(body).toEqual({ command: "list" });
    expect("args" in body).toBe(false);
  });

  it("uses env.DEV_TOOLS_URL when provided (override default localhost URL)", async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ ok: true, stdout: "", stderr: "", exitCode: 0 }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const action = findAction("xgd_ticket");
    await action!.handler!(
      { command: "get", args: ["TASK-1"] },
      makeCtx({
        DEV_TOOLS_ENABLED: "true",
        DEV_TOOLS_URL: "http://127.0.0.1:9999/xgd-ticket",
      }),
    );

    expect(fetchSpy.mock.calls[0]![0]).toBe(
      "http://127.0.0.1:9999/xgd-ticket",
    );
  });
});
