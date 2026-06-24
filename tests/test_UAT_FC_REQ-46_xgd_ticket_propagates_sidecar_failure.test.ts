import { afterEach, describe, expect, it, vi } from "vitest";
import { findAction } from "../apps/control-app/src/operator/registry.js";
import type { ActionContext } from "../apps/control-app/src/operator/registry.js";

function makeCtx(): ActionContext {
  return {
    session: { session_id: "s1", account_id: "acct-r46", plan_tier: "trial" },
    env: { DEV_TOOLS_ENABLED: "true" } as unknown as ActionContext["env"],
    emit: vi.fn(),
    siteDefinition: null,
    operatorLastMessage: null,
    requestOrigin: null,
  };
}

describe("UAT FC REQ-46: xgd_ticket handler surfaces sidecar failures as ActionResult{status:'failed'}", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("surfaces a 400 response with {ok:false, error} as a failed ActionResult carrying the sidecar error message", async () => {
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
    const action = findAction("xgd_ticket");
    const result = await action!.handler!({ command: "list" }, makeCtx());
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.error).toMatch(/not in the allowed set/);
    }
  });

  it("surfaces a 500 response without a structured body as a failed ActionResult", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: false }), { status: 500 }),
      ),
    );
    const action = findAction("xgd_ticket");
    const result = await action!.handler!({ command: "list" }, makeCtx());
    expect(result.status).toBe("failed");
  });

  it("surfaces a fetch throw (sidecar not running) as a failed ActionResult naming the URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );
    const action = findAction("xgd_ticket");
    const result = await action!.handler!({ command: "list" }, makeCtx());
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.error).toMatch(/sidecar/);
      expect(result.error).toMatch(/127\.0\.0\.1:7878/);
    }
  });

  it("surfaces non-JSON sidecar body as a failed ActionResult", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("not json at all", { status: 200 }),
      ),
    );
    const action = findAction("xgd_ticket");
    const result = await action!.handler!({ command: "list" }, makeCtx());
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.error).toMatch(/non-JSON/);
    }
  });
});
