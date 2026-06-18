import { describe, expect, it } from "vitest";
import { visibleToolSpecs } from "../apps/control-app/src/operator/registry.js";

describe("UAT FC REQ-13: get_site_definition is available on the trial plan (read-only, no tier rejection)", () => {
  it("appears in the visible tool list for trial sessions", () => {
    const trialTools = visibleToolSpecs("trial").map((t) => t.name);
    expect(trialTools).toContain("get_site_definition");
  });

  it("remains available on paid and enterprise tiers", () => {
    const paidTools = visibleToolSpecs("paid").map((t) => t.name);
    const entTools = visibleToolSpecs("enterprise").map((t) => t.name);
    expect(paidTools).toContain("get_site_definition");
    expect(entTools).toContain("get_site_definition");
  });

  it("is registered as a system_action with ui_route=null (chat-only)", async () => {
    const { findAction, OPERATOR_ACTIONS } = await import(
      "../apps/control-app/src/operator/registry.js"
    );
    const spec = findAction("get_site_definition");
    expect(spec).toBeDefined();
    expect(spec!.category).toBe("system_action");
    expect(spec!.plan_tier).toBe("trial");
    expect(spec!.ui_route).toBe(null);
    expect(typeof spec!.handler).toBe("function");
    // Sanity: it is part of OPERATOR_ACTIONS, not a duplicate registration.
    expect(
      OPERATOR_ACTIONS.filter((a) => a.name === "get_site_definition"),
    ).toHaveLength(1);
  });
});
