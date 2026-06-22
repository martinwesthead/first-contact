import { describe, expect, it } from "vitest";
import { getModule, listRegisteredModules } from "@gendev/framework";

describe("UAT FC REQ-43: logo-strip registered in framework catalog", () => {
  it("getModule('logo-strip', 1) returns logo-strip v1 with meta and Component", () => {
    const entry = getModule("logo-strip", 1);
    expect(entry.meta.id).toBe("logo-strip");
    expect(entry.meta.version).toBe(1);
    expect(entry.meta.variants).toEqual(
      expect.arrayContaining(["logos", "features"]),
    );
    expect(typeof entry.Component).toBe("function");
  });

  it("listRegisteredModules includes logo-strip v1", () => {
    const registered = listRegisteredModules();
    expect(registered).toEqual(
      expect.arrayContaining([{ id: "logo-strip", version: 1 }]),
    );
  });
});
