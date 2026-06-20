import { describe, expect, it } from "vitest";
import {
  getModule,
  listRegisteredModules,
  servicesGridMeta,
} from "@1stcontact/framework";

describe("UAT FC REQ-44: services-grid v2 is registered in the framework catalog", () => {
  it("meta declares version 2", () => {
    expect(servicesGridMeta.version).toBe(2);
  });

  it("listRegisteredModules contains services-grid v2", () => {
    expect(listRegisteredModules()).toEqual(
      expect.arrayContaining([{ id: "services-grid", version: 2 }]),
    );
  });

  it("getModule('services-grid', 2) resolves to the exported meta", () => {
    const entry = getModule("services-grid", 2);
    expect(entry.meta).toBe(servicesGridMeta);
    expect(typeof entry.Component).toBe("function");
  });

  it("meta declares all three variants including one-col", () => {
    expect(servicesGridMeta.variants).toEqual(
      expect.arrayContaining(["three-col", "two-col", "one-col"]),
    );
  });

  it("meta declares the imageStyle dial with icon/cover/thumb values", () => {
    expect(servicesGridMeta.dials.imageStyle).toEqual(
      expect.arrayContaining(["icon", "cover", "thumb"]),
    );
  });
});
