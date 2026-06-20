import { describe, expect, it } from "vitest";
import { meta } from "../packages/framework/src/modules/image-gallery/meta.js";

describe("UAT FC REQ-47: image-gallery meta declares imageSize dial", () => {
  it("exposes imageSize in dials with values [sm, md, lg]", () => {
    const dials = meta.dials as Record<string, readonly string[]>;
    expect(dials.imageSize).toBeDefined();
    expect(dials.imageSize).toEqual(["sm", "md", "lg"]);
  });
});
