import { describe, expect, it } from "vitest";
import { getModule, listRegisteredModules } from "@1stcontact/framework";

describe("UAT FC REQ-40: testimonials registered in framework catalog", () => {
  it("getModule('testimonials', 1) returns testimonials v1 with meta and Component", () => {
    const entry = getModule("testimonials", 1);
    expect(entry.meta.id).toBe("testimonials");
    expect(entry.meta.version).toBe(1);
    expect(entry.meta.variants).toEqual(
      expect.arrayContaining(["single", "grid"]),
    );
    expect(typeof entry.Component).toBe("function");
  });

  it("listRegisteredModules includes testimonials v1", () => {
    const registered = listRegisteredModules();
    expect(registered).toEqual(
      expect.arrayContaining([{ id: "testimonials", version: 1 }]),
    );
  });
});
