import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ALLOWED_COMMANDS,
  handleXgdTicket,
  type HandlerConfig,
  type Spawner,
} from "@gendev/dev-tools-server/handler";
import {
  findAction,
  visibleToolSpecs,
} from "../apps/control-app/src/operator/registry.js";
import type { ActionContext } from "../apps/control-app/src/operator/registry.js";

// ---------------------------------------------------------------------------
// Reconciliation UATs for story-d44dfd7c — dev-only xgd_ticket tool for the
// builder chat AI (sidecar + Workers-side operator action).
//
// Two boundaries are exercised:
//   * the localhost sidecar handler (handleXgdTicket) — the half that spawns
//     the xgd CLI, with the spawn function injected so the allowlist and cwd
//     guard are verified without a real spawn (AC-785/786/787);
//   * the Workers-side `xgd_ticket` operator action + tool-set gating, driven
//     through the operator registry with global fetch stubbed as the injected
//     request function (AC-779..784).
// ---------------------------------------------------------------------------

const PROJECT_ROOT = "/Users/martin/Projects/first-contact";

function recordingSpawner(): {
  spawn: Spawner;
  calls: Array<{ bin: string; args: readonly string[]; cwd: string }>;
} {
  const calls: Array<{ bin: string; args: readonly string[]; cwd: string }> = [];
  const spawn: Spawner = async (bin, args, opts) => {
    calls.push({ bin, args: [...args], cwd: opts.cwd });
    return { stdout: "ok-out", stderr: "ok-err", exitCode: 0 };
  };
  return { spawn, calls };
}

function makeCfg(overrides: Partial<HandlerConfig> = {}): HandlerConfig {
  return {
    xgdBin: "/fake/xgd",
    projectCwd: PROJECT_ROOT,
    allowedProjectRoot: PROJECT_ROOT,
    allowedCommands: ALLOWED_COMMANDS,
    spawn: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
    ...overrides,
  };
}

function makeCtx(
  env: { DEV_TOOLS_ENABLED?: string; DEV_TOOLS_URL?: string } = {
    DEV_TOOLS_ENABLED: "true",
  },
): ActionContext {
  return {
    session: { session_id: "s1", account_id: "acct-r46", plan_tier: "trial" },
    env: env as unknown as ActionContext["env"],
    emit: vi.fn(),
    siteDefinition: null,
    operatorLastMessage: null,
  };
}

describe("UAT AC-787: sidecar runs an allowed command in the project directory and returns structured output", () => {
  it("test_UAT_AC787_sidecar_spawns_allowed_command_in_project_cwd", async () => {
    // Every allowed verb spawns `xgd ticket <command> <args>` in the project
    // cwd and returns {ok:true, stdout, stderr, exitCode}.
    for (const command of ALLOWED_COMMANDS) {
      const { spawn, calls } = recordingSpawner();
      const result = await handleXgdTicket(
        { command, args: ["--type", "task"] },
        makeCfg({ spawn }),
      );

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        ok: true,
        stdout: "ok-out",
        stderr: "ok-err",
        exitCode: 0,
      });

      expect(calls).toHaveLength(1);
      expect(calls[0]!.bin).toBe("/fake/xgd");
      expect(calls[0]!.args).toEqual(["ticket", command, "--type", "task"]);
      expect(calls[0]!.cwd).toBe(PROJECT_ROOT);
    }
  });
});

describe("UAT AC-786: sidecar refuses a working directory outside the project root with HTTP 500 and never spawns", () => {
  it("test_UAT_AC786_sidecar_refuses_cwd_outside_project_root_with_500", async () => {
    // Includes a prefix-sharing sibling — the guard must compare resolved path
    // segments, not a raw string prefix, so the sibling is rejected too.
    const outsideCwds = [
      "/Users/martin/Projects/other-repo",
      "/etc",
      "/Users/martin/Projects/first-contact-evil",
    ];
    for (const projectCwd of outsideCwds) {
      const { spawn, calls } = recordingSpawner();
      const result = await handleXgdTicket(
        { command: "list" },
        makeCfg({ projectCwd, spawn }),
      );

      expect(result.status).toBe(500);
      expect(result.body.ok).toBe(false);
      if (!result.body.ok) {
        expect(result.body.error).toMatch(/not under allowed root/);
      }
      expect(calls).toHaveLength(0);
    }

    // Control: cwd equal to the root (and a subdirectory of it) IS allowed and
    // spawns — proving the 500s above are the guard firing, not a blanket deny.
    for (const projectCwd of [PROJECT_ROOT, `${PROJECT_ROOT}/apps/control-app`]) {
      const { spawn, calls } = recordingSpawner();
      const result = await handleXgdTicket(
        { command: "list" },
        makeCfg({ projectCwd, allowedProjectRoot: PROJECT_ROOT, spawn }),
      );
      expect(result.status).toBe(200);
      expect(calls).toHaveLength(1);
      expect(calls[0]!.cwd).toBe(projectCwd);
    }
  });
});

describe("UAT AC-785: sidecar rejects a command outside the allowlist with HTTP 400 and never spawns", () => {
  it("test_UAT_AC785_sidecar_rejects_unlisted_command_with_400", async () => {
    const { spawn, calls } = recordingSpawner();
    const result = await handleXgdTicket(
      { command: "delete", args: ["TASK-1"] },
      makeCfg({ spawn }),
    );

    expect(result.status).toBe(400);
    expect(result.body.ok).toBe(false);
    if (!result.body.ok) {
      // Error names the allowed set so the caller knows what is permitted.
      expect(result.body.error).toMatch(/create/);
      expect(result.body.error).toMatch(/list/);
      expect(result.body.error).toMatch(/get/);
    }
    expect(calls).toHaveLength(0);
  });
});

describe("UAT AC-784: xgd_ticket action surfaces a sidecar failure as a failed result", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("test_UAT_AC784_action_surfaces_sidecar_failure_as_failed_result", async () => {
    const action = findAction("xgd_ticket");
    expect(action?.handler).toBeDefined();

    // (a) non-2xx with a structured {ok:false,error} body → error surfaced.
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              ok: false,
              error: "command 'create' is not in the allowed set",
            }),
            { status: 400 },
          ),
      ),
    );
    let result = await action!.handler!({ command: "list" }, makeCtx());
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.error).toMatch(/not in the allowed set/);
    }

    // (b) unreachable sidecar (fetch throws) → failed, naming the URL.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );
    result = await action!.handler!({ command: "list" }, makeCtx());
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.error).toMatch(/sidecar/);
      expect(result.error).toMatch(/127\.0\.0\.1:7878/);
    }

    // (c) non-JSON body → failed with a non-JSON diagnostic.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not json at all", { status: 200 })),
    );
    result = await action!.handler!({ command: "list" }, makeCtx());
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.error).toMatch(/non-JSON/);
    }
  });
});

describe("UAT AC-783: xgd_ticket action routes an allowed command to the sidecar and surfaces stdout/stderr/exit code", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("test_UAT_AC783_action_routes_to_sidecar_and_surfaces_output", async () => {
    const sidecarResponse = {
      ok: true,
      stdout: "Created ticket TASK-99 (task-abc)",
      stderr: "",
      exitCode: 0,
    };
    const fetchSpy = vi.fn(
      async () =>
        new Response(JSON.stringify(sidecarResponse), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const action = findAction("xgd_ticket");
    const result = await action!.handler!(
      { command: "create", args: ["--type", "task", "--title", "Demo"] },
      makeCtx(),
    );

    // A POST carrying {command, args} JSON is issued to the sidecar URL.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("http://127.0.0.1:7878/xgd-ticket");
    expect(init!.method).toBe("POST");
    expect(JSON.parse(init!.body as string)).toEqual({
      command: "create",
      args: ["--type", "task", "--title", "Demo"],
    });

    // The sidecar's stdout/stderr/exitCode are surfaced, kind-tagged so the
    // AI's next turn receives the output.
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.payload!.stdout).toBe(sidecarResponse.stdout);
      expect(result.payload!.stderr).toBe(sidecarResponse.stderr);
      expect(result.payload!.exitCode).toBe(0);
      expect(result.payload!.kind).toBe("xgd_ticket_result");
    }
  });
});

describe("UAT AC-782: xgd_ticket action rejects commands outside the allowlist without contacting the sidecar", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("test_UAT_AC782_action_rejects_unlisted_command_without_request", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const action = findAction("xgd_ticket");
    const result = await action!.handler!(
      { command: "delete", args: ["TASK-1"] },
      makeCtx(),
    );

    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.error).toMatch(/create/);
      expect(result.error).toMatch(/list/);
      expect(result.error).toMatch(/get/);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("UAT AC-781: xgd_ticket action fails closed when dev-tools disabled, without contacting the sidecar", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("test_UAT_AC781_action_fails_closed_when_dev_tools_disabled", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const action = findAction("xgd_ticket");
    // Forced invocation with the flag unset must still fail closed (defence in
    // depth) and never reach out to the sidecar.
    const result = await action!.handler!({ command: "list" }, makeCtx({}));

    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.error).toMatch(/dev-only/);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("UAT AC-780: xgd_ticket tool is present with the {create,list,get} contract when dev-tools are enabled", () => {
  it("test_UAT_AC780_tool_present_with_command_enum_when_dev_enabled", () => {
    const specs = visibleToolSpecs("trial", { devToolsEnabled: true });
    const spec = specs.find((s) => s.name === "xgd_ticket");
    expect(spec).toBeDefined();

    const schema = spec!.input_schema as {
      type: string;
      properties: {
        command: { type: string; enum: string[] };
        args: { type: string; items: { type: string } };
      };
      required: string[];
    };
    expect(schema.type).toBe("object");
    expect(schema.properties.command.type).toBe("string");
    expect(new Set(schema.properties.command.enum)).toEqual(
      new Set(["create", "list", "get"]),
    );
    expect(schema.properties.args.type).toBe("array");
    expect(schema.properties.args.items.type).toBe("string");
    expect(schema.required).toEqual(["command"]);
  });
});

describe("UAT AC-779: xgd_ticket tool is absent from the AI tool set when dev-tools are disabled", () => {
  it("test_UAT_AC779_tool_absent_when_dev_tools_disabled_any_tier", () => {
    // Production default (no opts), explicit false, and paid tier — none expose
    // the tool. Plan tier is irrelevant to the gate.
    expect(visibleToolSpecs("trial").map((s) => s.name)).not.toContain(
      "xgd_ticket",
    );
    expect(
      visibleToolSpecs("trial", { devToolsEnabled: false }).map((s) => s.name),
    ).not.toContain("xgd_ticket");
    expect(visibleToolSpecs("paid").map((s) => s.name)).not.toContain(
      "xgd_ticket",
    );
  });
});
