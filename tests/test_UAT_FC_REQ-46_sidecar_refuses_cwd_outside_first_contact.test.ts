import { describe, expect, it } from "vitest";
import {
  ALLOWED_COMMANDS,
  handleXgdTicket,
  type HandlerConfig,
  type Spawner,
} from "@gendev/dev-tools-server/handler";

function recordingSpawner(): {
  spawn: Spawner;
  calls: Array<{ bin: string; args: readonly string[]; cwd: string }>;
} {
  const calls: Array<{ bin: string; args: readonly string[]; cwd: string }> = [];
  const spawn: Spawner = async (bin, args, opts) => {
    calls.push({ bin, args: [...args], cwd: opts.cwd });
    return { stdout: "", stderr: "", exitCode: 0 };
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

describe("UAT FC REQ-46: sidecar refuses to spawn when configured cwd is outside the first-contact project root", () => {
  it("refuses cwd=/Users/martin/Projects/other-repo with 500 and never spawns xgd", async () => {
    const { spawn, calls } = recordingSpawner();
    const cfg = makeCfg({
      projectCwd: "/Users/martin/Projects/other-repo",
      spawn,
    });
    const result = await handleXgdTicket({ command: "list" }, cfg);
    expect(result.status).toBe(500);
    expect(result.body.ok).toBe(false);
    if (!result.body.ok) {
      expect(result.body.error).toMatch(/not under allowed root/);
      expect(result.body.error).toMatch(/other-repo/);
    }
    expect(calls).toHaveLength(0);
  });

  it("refuses cwd=/etc with 500 and never spawns xgd", async () => {
    const { spawn, calls } = recordingSpawner();
    const result = await handleXgdTicket(
      { command: "list" },
      makeCfg({ projectCwd: "/etc", spawn }),
    );
    expect(result.status).toBe(500);
    expect(result.body.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("refuses cwd that is a sibling whose path shares a prefix string with the root (no path-prefix substring attack)", async () => {
    const { spawn, calls } = recordingSpawner();
    // '/Users/martin/Projects/first-contact-evil' shares the leading bytes of
    // '/Users/martin/Projects/first-contact' but is NOT under it. The guard
    // must compare path segments, not raw string prefix.
    const result = await handleXgdTicket(
      { command: "list" },
      makeCfg({
        projectCwd: "/Users/martin/Projects/first-contact-evil",
        spawn,
      }),
    );
    expect(result.status).toBe(500);
    expect(result.body.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("accepts cwd equal to the configured root and spawns", async () => {
    const { spawn, calls } = recordingSpawner();
    const result = await handleXgdTicket(
      { command: "list" },
      makeCfg({
        projectCwd: "/Users/martin/Projects/first-contact",
        spawn,
      }),
    );
    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.cwd).toBe("/Users/martin/Projects/first-contact");
  });

  it("accepts cwd that is a subdirectory of the configured root and spawns", async () => {
    const { spawn, calls } = recordingSpawner();
    const result = await handleXgdTicket(
      { command: "list" },
      makeCfg({
        projectCwd: "/Users/martin/Projects/first-contact/apps/control-app",
        allowedProjectRoot: "/Users/martin/Projects/first-contact",
        spawn,
      }),
    );
    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.cwd).toBe(
      "/Users/martin/Projects/first-contact/apps/control-app",
    );
  });
});
