import { describe, expect, it } from "vitest";
import { getModule, listRegisteredModules } from "@gendev/framework";

describe("UAT FC REQ-4: registry resolves known module", () => {
  it("getModule('hero', 1) returns hero v1 with meta and Component", () => {
    const entry = getModule("hero", 1);
    expect(entry.meta.id).toBe("hero");
    expect(entry.meta.version).toBe(1);
    expect(entry.meta.variants).toEqual(expect.arrayContaining(["bg-color", "bg-image"]));
    expect(typeof entry.Component).toBe("function");
  });

  it("registers header v1, hero v1, and footer v1", () => {
    const registered = listRegisteredModules();
    expect(registered).toEqual(
      expect.arrayContaining([
        { id: "header", version: 1 },
        { id: "hero", version: 1 },
        { id: "footer", version: 1 },
      ]),
    );
  });
});
