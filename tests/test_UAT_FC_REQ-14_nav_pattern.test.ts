import { describe, expect, it } from "vitest";
import { applyToolCall, type ToolName } from "@1stcontact/builder-ui/tools";
import { buildFrameworkCatalog } from "@1stcontact/builder-ui";
import { findAction } from "../apps/control-app/src/operator/registry.js";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import type { Site } from "@1stcontact/site-schema";

const catalog = buildFrameworkCatalog();

function call(
  site: Site,
  name: string,
  input: Record<string, unknown>,
): ReturnType<typeof applyToolCall> {
  return applyToolCall(site, catalog, { name: name as ToolName, input });
}

describe("UAT FC REQ-14: set_nav_pattern", () => {
  it("registers set_nav_pattern as a state_edit tool", () => {
    const action = findAction("set_nav_pattern");
    expect(action).toBeDefined();
    expect(action!.category).toBe("state_edit");
  });

  it("set_nav_pattern_updates_site applies an allowed enum value", () => {
    const site = load1stContactSite();
    const result = call(site, "set_nav_pattern", { pattern: "top-tabs" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.next.nav.pattern).toBe("top-tabs");
  });

  it("set_nav_pattern_rejects_unknown rejects a non-enum value with structured error", () => {
    const site = load1stContactSite();
    const result = call(site, "set_nav_pattern", { pattern: "sidebar" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.path).toBe("nav.pattern");
    expect(result.error.got).toBe("sidebar");
    expect(Array.isArray(result.error.expected)).toBe(true);
  });

  it("set_nav_pattern rejects a non-string input", () => {
    const site = load1stContactSite();
    const result = call(site, "set_nav_pattern", { pattern: 42 });
    expect(result.ok).toBe(false);
  });
});
