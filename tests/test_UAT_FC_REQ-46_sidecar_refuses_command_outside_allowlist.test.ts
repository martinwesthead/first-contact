import { describe, expect, it } from "vitest";
import {
  ALLOWED_COMMANDS,
  handleXgdTicket,
  type HandlerConfig,
  type Spawner,
} from "@1stcontact/dev-tools-server/handler";

function recordingSpawner(): {
  spawn: Spawner;
  calls: Array<{ bin: string; args: readonly string[]; cwd: string }>;
} {
  const calls: Array<{ bin: string; args: readonly string[]; cwd: string }> = [];
  const spawn: Spawner = async (bin, args, opts) => {
    calls.push({ bin, args: [...args], cwd: opts.cwd });
    return { stdout: "should-not-happen", stderr: "", exitCode: 0 };
  };
  return { spawn, calls };
}

function makeCfg(overrides: Partial<HandlerConfig> = {}): HandlerConfig {
  return {
    xgdBin: "/fake/xgd",
    projectCwd: "/Users/martin/Projects/first-contact",
    allowedProjectRoot: "/Users/martin/Projects/first-contact",
    allowedCommands: ALLOWED_COMMANDS,
    spawn: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
    ...overrides,
  };
}

describe("UAT FC REQ-46: sidecar refuses commands outside the create/list/get allowlist", () => {
  it("rejects 'delete' with 400 and never spawns xgd", async () => {
    const { spawn, calls } = recordingSpawner();
    const cfg = makeCfg({ spawn });
    const result = await handleXgdTicket(
      { command: "delete", args: ["TASK-1"] },
      cfg,
    );
    expect(result.status).toBe(400);
    expect(result.body.ok).toBe(false);
    if (!result.body.ok) {
      expect(result.body.error).toMatch(/not in the allowed set/);
      expect(result.body.error).toMatch(/create/);
      expect(result.body.error).toMatch(/list/);
      expect(result.body.error).toMatch(/get/);
    }
    expect(calls).toHaveLength(0);
  });

  it("rejects 'update' (another non-allowed verb) with 400 and never spawns", async () => {
    const { spawn, calls } = recordingSpawner();
    const result = await handleXgdTicket(
      { command: "update", args: ["TASK-1", "--status", "done"] },
      makeCfg({ spawn }),
    );
    expect(result.status).toBe(400);
    expect(result.body.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("rejects an empty command with 400 and never spawns", async () => {
    const { spawn, calls } = recordingSpawner();
    const result = await handleXgdTicket({ command: "" }, makeCfg({ spawn }));
    expect(result.status).toBe(400);
    expect(result.body.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("rejects a non-string command with 400 and never spawns", async () => {
    const { spawn, calls } = recordingSpawner();
    const result = await handleXgdTicket(
      { command: 42 as unknown as string },
      makeCfg({ spawn }),
    );
    expect(result.status).toBe(400);
    expect(result.body.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("accepts 'list' with valid args and spawns xgd with the correct argv", async () => {
    const { spawn, calls } = recordingSpawner();
    const result = await handleXgdTicket(
      { command: "list", args: ["--type", "task"] },
      makeCfg({ spawn }),
    );
    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.bin).toBe("/fake/xgd");
    expect(calls[0]!.args).toEqual(["ticket", "list", "--type", "task"]);
    expect(calls[0]!.cwd).toBe("/Users/martin/Projects/first-contact");
  });

  it("accepts 'create' and 'get' (full allowlist coverage) and spawns each correctly", async () => {
    for (const command of ["create", "get"] as const) {
      const { spawn, calls } = recordingSpawner();
      const result = await handleXgdTicket(
        { command, args: ["X"] },
        makeCfg({ spawn }),
      );
      expect(result.status).toBe(200);
      expect(result.body.ok).toBe(true);
      expect(calls[0]!.args).toEqual(["ticket", command, "X"]);
    }
  });

  it("rejects non-string args elements (defence in depth) and never spawns", async () => {
    const { spawn, calls } = recordingSpawner();
    const result = await handleXgdTicket(
      { command: "list", args: ["--type", 42 as unknown as string] },
      makeCfg({ spawn }),
    );
    expect(result.status).toBe(400);
    expect(result.body.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });
});
