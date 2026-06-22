import { describe, expect, it } from "vitest";
import {
  getModule,
  listRegisteredModules,
  splitSectionMeta,
} from "@gendev/framework";

describe("UAT FC REQ-39: split-section is registered in the framework catalog", () => {
  it("listRegisteredModules contains split-section v1", () => {
    expect(listRegisteredModules()).toEqual(
      expect.arrayContaining([{ id: "split-section", version: 1 }]),
    );
  });

  it("getModule('split-section', 1) resolves and exposes the exported meta", () => {
    const entry = getModule("split-section", 1);
    expect(entry.meta).toBe(splitSectionMeta);
    expect(typeof entry.Component).toBe("function");
  });

  it("meta declares both image-left and image-right variants", () => {
    expect(splitSectionMeta.variants).toEqual(
      expect.arrayContaining(["image-left", "image-right"]),
    );
  });
});
