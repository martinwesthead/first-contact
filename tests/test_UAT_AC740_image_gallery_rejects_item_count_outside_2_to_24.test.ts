import { describe, expect, it } from "vitest";
import { meta } from "../packages/framework/src/modules/image-gallery/meta.js";
import { validateModuleContent } from "../packages/framework/src/modules/validate.js";

const item = { image: { id: "x", src: "/img/x.jpg", alt: "x" } };

describe("UAT AC-740: image-gallery rejects items[] length outside 2..24", () => {
  it("test_UAT_AC740_image_gallery_rejects_item_count_outside_2_to_24", () => {
    // 1 item: rejected, the violation identifies the items field and the min bound.
    const tooFew = validateModuleContent(meta, { items: [item] });
    expect(tooFew.ok).toBe(false);
    const tooFewIssue = tooFew.issues.find(
      (i) => i.path.join(".") === "items" && /at least 2/.test(i.message),
    );
    expect(tooFewIssue).toBeDefined();

    // 25 items: rejected, the violation identifies the items field and the max bound.
    const tooMany = validateModuleContent(meta, {
      items: Array.from({ length: 25 }, () => item),
    });
    expect(tooMany.ok).toBe(false);
    const tooManyIssue = tooMany.issues.find(
      (i) => i.path.join(".") === "items" && /at most 24/.test(i.message),
    );
    expect(tooManyIssue).toBeDefined();

    // Counts within 2..24 (including the boundaries) are accepted.
    expect(validateModuleContent(meta, { items: [item, item] }).ok).toBe(true);
    expect(
      validateModuleContent(meta, {
        items: Array.from({ length: 24 }, () => item),
      }).ok,
    ).toBe(true);

    // Each item is an object requiring an image asset-ref: a non-asset image is
    // rejected with a violation on the item's image field.
    const badImage = validateModuleContent(meta, {
      items: [item, { image: "not-an-asset" as unknown as object }],
    });
    expect(badImage.ok).toBe(false);
    const badImageIssue = badImage.issues.find(
      (i) =>
        i.path[0] === "items" &&
        i.path[i.path.length - 1] === "image" &&
        /asset-ref/.test(i.message),
    );
    expect(badImageIssue).toBeDefined();

    // The caption is optional: an item with only an image validates.
    const noCaption = validateModuleContent(meta, { items: [item, item] });
    expect(noCaption.ok).toBe(true);
  });
});
