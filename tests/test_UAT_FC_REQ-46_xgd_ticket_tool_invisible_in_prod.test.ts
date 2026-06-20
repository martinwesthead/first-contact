import { describe, expect, it } from "vitest";
import { visibleToolSpecs } from "../apps/control-app/src/operator/registry.js";

describe("UAT FC REQ-46: xgd_ticket tool is invisible to chat sessions when DEV_TOOLS_ENABLED is not set", () => {
  it("excludes xgd_ticket from visibleToolSpecs with no opts (production default)", () => {
    const specs = visibleToolSpecs("trial");
    const names = specs.map((s) => s.name);
    expect(names).not.toContain("xgd_ticket");
    // sanity: other tools are still visible
    expect(names).toContain("set_module_content");
    expect(names).toContain("get_site_definition");
  });

  it("excludes xgd_ticket when devToolsEnabled is false", () => {
    const specs = visibleToolSpecs("trial", { devToolsEnabled: false });
    expect(specs.map((s) => s.name)).not.toContain("xgd_ticket");
  });

  it("excludes xgd_ticket even on paid tier when devToolsEnabled is not true", () => {
    const specs = visibleToolSpecs("paid");
    expect(specs.map((s) => s.name)).not.toContain("xgd_ticket");
  });
});
