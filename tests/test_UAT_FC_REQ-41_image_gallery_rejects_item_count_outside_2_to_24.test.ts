import { describe, expect, it } from "vitest";
import { meta } from "../packages/framework/src/modules/image-gallery/meta.js";
import { validateModuleContent } from "../packages/framework/src/modules/validate.js";

const item = { image: { id: "x", src: "/img/x.jpg", alt: "x" } };

describe("UAT FC REQ-41: image-gallery rejects item count outside 2..24", () => {
  it("rejects content with 1 item", () => {
    const result = validateModuleContent(meta, { items: [item] });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => /at least 2/.test(i.message))).toBe(true);
  });

  it("rejects content with 25 items", () => {
    const result = validateModuleContent(meta, {
      items: Array.from({ length: 25 }, () => item),
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => /at most 24/.test(i.message))).toBe(true);
  });

  it("accepts content at the boundaries (2 and 24 items)", () => {
    const two = validateModuleContent(meta, { items: [item, item] });
    expect(two.ok).toBe(true);

    const twentyFour = validateModuleContent(meta, {
      items: Array.from({ length: 24 }, () => item),
    });
    expect(twentyFour.ok).toBe(true);
  });

  it("rejects an item whose image is not an asset-ref", () => {
    const result = validateModuleContent(meta, {
      items: [item, { image: "not-an-asset" as unknown as object }],
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => /asset-ref/.test(i.message))).toBe(true);
  });
});
