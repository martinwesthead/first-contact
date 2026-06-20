import type { ActionHandler, ActionResult } from "./registry.js";

export interface XgdTicketEnv {
  readonly DEV_TOOLS_ENABLED?: string;
  readonly DEV_TOOLS_URL?: string;
}

export const XGD_TICKET_ALLOWED_COMMANDS = ["create", "list", "get"] as const;
const DEFAULT_SIDECAR_URL = "http://127.0.0.1:7878/xgd-ticket";

/**
 * REQ-46 — dev-only system action that proxies a constrained `xgd ticket`
 * allowlist to a localhost sidecar (tools/dev-tools-server). The sidecar
 * is what spawns the xgd CLI against ~/Projects/first-contact; this
 * handler is the Workers half that talks to it.
 *
 * Gating: visibleToolSpecs() hides this tool unless DEV_TOOLS_ENABLED is
 * "true" on the worker env, so the AI never sees it in production. The
 * handler also re-checks DEV_TOOLS_ENABLED itself as defence in depth.
 */
export const xgdTicketHandler: ActionHandler = async (input, ctx) => {
  const env = ctx.env as XgdTicketEnv;
  if (env.DEV_TOOLS_ENABLED !== "true") {
    return fail("xgd_ticket is dev-only and is disabled in this environment");
  }
  const command = typeof input.command === "string" ? input.command : null;
  if (
    !command ||
    !XGD_TICKET_ALLOWED_COMMANDS.includes(
      command as (typeof XGD_TICKET_ALLOWED_COMMANDS)[number],
    )
  ) {
    return fail(
      `'command' must be one of: ${XGD_TICKET_ALLOWED_COMMANDS.join(", ")}`,
    );
  }
  let args: string[] | undefined;
  if (input.args !== undefined) {
    if (
      !Array.isArray(input.args) ||
      !input.args.every((a) => typeof a === "string")
    ) {
      return fail("'args' must be an array of strings when provided");
    }
    args = input.args as string[];
  }
  const url = env.DEV_TOOLS_URL ?? DEFAULT_SIDECAR_URL;
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(args === undefined ? { command } : { command, args }),
    });
  } catch (err) {
    return fail(`dev-tools sidecar unreachable at ${url}: ${String(err)}`);
  }
  const raw = await resp.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fail(
      `dev-tools sidecar returned non-JSON body (status ${resp.status})`,
    );
  }
  if (!isObj(parsed)) {
    return fail(`dev-tools sidecar returned non-object body`);
  }
  if (!resp.ok || parsed.ok === false) {
    const message =
      typeof parsed.error === "string"
        ? parsed.error
        : `sidecar returned status ${resp.status}`;
    return fail(message);
  }
  return { status: "ok", payload: parsed };
};

function fail(error: string): ActionResult {
  return { status: "failed", error };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
