import { resolve, sep } from "node:path";

export interface XgdTicketRequest {
  readonly command?: unknown;
  readonly args?: unknown;
}

export type XgdTicketResponse =
  | {
      readonly ok: true;
      readonly stdout: string;
      readonly stderr: string;
      readonly exitCode: number;
    }
  | { readonly ok: false; readonly error: string };

export type Spawner = (
  bin: string,
  args: readonly string[],
  opts: { readonly cwd: string },
) => Promise<{ stdout: string; stderr: string; exitCode: number }>;

export interface HandlerConfig {
  readonly xgdBin: string;
  readonly projectCwd: string;
  readonly allowedProjectRoot: string;
  readonly allowedCommands: readonly string[];
  readonly spawn: Spawner;
}

export interface HandlerResult {
  readonly status: number;
  readonly body: XgdTicketResponse;
}

export async function handleXgdTicket(
  req: XgdTicketRequest,
  cfg: HandlerConfig,
): Promise<HandlerResult> {
  const normalizedCwd = resolve(cfg.projectCwd);
  const normalizedRoot = resolve(cfg.allowedProjectRoot);
  if (
    normalizedCwd !== normalizedRoot &&
    !normalizedCwd.startsWith(normalizedRoot + sep)
  ) {
    return {
      status: 500,
      body: {
        ok: false,
        error:
          `XGD_CWD '${cfg.projectCwd}' is not under allowed root '${cfg.allowedProjectRoot}' — refusing to spawn`,
      },
    };
  }
  if (typeof req.command !== "string" || req.command.length === 0) {
    return {
      status: 400,
      body: { ok: false, error: "'command' must be a non-empty string" },
    };
  }
  if (!cfg.allowedCommands.includes(req.command)) {
    return {
      status: 400,
      body: {
        ok: false,
        error:
          `command '${req.command}' is not in the allowed set [${cfg.allowedCommands.join(", ")}]`,
      },
    };
  }
  let args: string[] = [];
  if (req.args !== undefined) {
    if (!Array.isArray(req.args)) {
      return {
        status: 400,
        body: { ok: false, error: "'args' must be an array of strings" },
      };
    }
    for (const a of req.args) {
      if (typeof a !== "string") {
        return {
          status: 400,
          body: {
            ok: false,
            error: "'args' must be an array of strings (got non-string element)",
          },
        };
      }
      args.push(a);
    }
  }
  const argv = ["ticket", req.command, ...args];
  const result = await cfg.spawn(cfg.xgdBin, argv, { cwd: normalizedCwd });
  return {
    status: 200,
    body: {
      ok: true,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    },
  };
}

export const ALLOWED_COMMANDS: readonly string[] = ["create", "list", "get"];
