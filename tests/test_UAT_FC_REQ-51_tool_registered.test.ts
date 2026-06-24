import { describe, expect, it } from "vitest";
import { findAction, visibleToolSpecs } from "../apps/control-app/src/operator/registry.js";

describe("UAT FC REQ-51: preview_generated_page is registered in the operator action registry", () => {
  it("AC7: findAction('preview_generated_page') returns a system_action with a handler", () => {
    const action = findAction("preview_generated_page");
    expect(action).toBeDefined();
    expect(action?.category).toBe("system_action");
    expect(typeof action?.handler).toBe("function");
    expect(action?.plan_tier).toBe("trial");
  });

  it("AC7: visibleToolSpecs (trial tier) exposes the tool with pageId + compareToDigestId in its input_schema", () => {
    const specs = visibleToolSpecs("trial");
    const spec = specs.find((s) => s.name === "preview_generated_page");
    expect(spec).toBeDefined();
    const schema = spec!.input_schema as {
      type: string;
      properties: Record<string, unknown>;
      required?: string[];
    };
    expect(schema.type).toBe("object");
    expect(Object.keys(schema.properties).sort()).toEqual([
      "compareToDigestId",
      "pageId",
    ]);
    // Both fields are optional — required must not include either.
    expect(schema.required ?? []).toEqual([]);
  });

  it("AC8: tool description mentions the self-inspection use case so the AI knows when to call it", () => {
    const action = findAction("preview_generated_page");
    expect(action).toBeDefined();
    const desc = action!.tool_spec.description;
    // Per ticket scope: the description emphasises 'check your own work' framing.
    expect(/your (own )?work|what (does )?this page (look|looks)/.test(desc)).toBe(true);
  });
});
