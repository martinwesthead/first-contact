import { describe, expect, it } from "vitest";
import { visibleToolSpecs } from "../apps/control-app/src/operator/registry.js";

describe("UAT FC REQ-46: xgd_ticket appears in visibleToolSpecs when devToolsEnabled=true", () => {
  it("includes xgd_ticket in the tool list", () => {
    const specs = visibleToolSpecs("trial", { devToolsEnabled: true });
    const names = specs.map((s) => s.name);
    expect(names).toContain("xgd_ticket");
  });

  it("declares an input_schema with command enum [create, list, get] and optional args array", () => {
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
