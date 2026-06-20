import { afterEach, describe, expect, it, vi } from "vitest";
import { findAction } from "../apps/control-app/src/operator/registry.js";
import type { ActionContext } from "../apps/control-app/src/operator/registry.js";

function makeCtx(devToolsEnabled = true): ActionContext {
  return {
    session: { session_id: "s1", account_id: "acct-r46", plan_tier: "trial" },
    env: {
      DEV_TOOLS_ENABLED: devToolsEnabled ? "true" : undefined,
    } as unknown as ActionContext["env"],
    emit: vi.fn(),
    siteDefinition: null,
    operatorLastMessage: null,
  };
}

describe("UAT FC REQ-46: xgd_ticket handler rejects unknown commands without contacting the sidecar", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects command='delete' and never calls fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const action = findAction("xgd_ticket");
    expect(action?.handler).toBeDefined();
    const result = await action!.handler!(
      { command: "delete", args: ["TASK-1"] },
      makeCtx(true),
    );
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.error).toMatch(/create/);
      expect(result.error).toMatch(/list/);
      expect(result.error).toMatch(/get/);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects command='update' and never calls fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const action = findAction("xgd_ticket");
    const result = await action!.handler!(
      { command: "update" },
      makeCtx(true),
    );
    expect(result.status).toBe("failed");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects non-string args (defence in depth) and never calls fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const action = findAction("xgd_ticket");
    const result = await action!.handler!(
      { command: "list", args: ["--type", 42 as unknown as string] },
      makeCtx(true),
    );
    expect(result.status).toBe("failed");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses to run when DEV_TOOLS_ENABLED is unset, even with a valid command", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const action = findAction("xgd_ticket");
    const result = await action!.handler!(
      { command: "list" },
      makeCtx(false),
    );
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.error).toMatch(/dev-only/);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
