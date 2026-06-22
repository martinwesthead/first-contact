import { describe, expect, it } from "vitest";
import {
  getModule,
  imageGalleryMeta,
  listRegisteredModules,
} from "@gendev/framework";

describe("UAT FC REQ-41: image-gallery is registered in the framework catalog", () => {
  it("listRegisteredModules contains (image-gallery, v1)", () => {
    expect(listRegisteredModules()).toEqual(
      expect.arrayContaining([
        { id: imageGalleryMeta.id, version: imageGalleryMeta.version },
      ]),
    );
  });

  it("getModule('image-gallery', 1) resolves to the right meta and a component", () => {
    const entry = getModule("image-gallery", 1);
    expect(entry.meta).toBe(imageGalleryMeta);
    expect(typeof entry.Component).toBe("function");
  });
});
