import { describe, expect, it } from "vitest";
import { meta } from "../packages/framework/src/modules/services-grid/meta.js";
import { validateModuleContent } from "../packages/framework/src/modules/validate.js";

const validItem = { title: "X", body: "<p>x</p>" };

describe("UAT AC-432: services-grid rejects items array with cardinality outside 2..6", () => {
  it("test_UAT_AC432_services_grid_rejects_item_count_outside_2_to_6", () => {
    // 1 item: rejected, message names the min-of-2 bound, path identifies items.
    const tooFew = validateModuleContent(meta, { items: [validItem] });
    expect(tooFew.ok).toBe(false);
    const tooFewIssue = tooFew.issues.find(
      (i) => i.path.join(".") === "items" && /at least 2/.test(i.message),
    );
    expect(tooFewIssue).toBeDefined();

    // 7 items: rejected, message names the max-of-6 bound, path identifies items.
    const tooMany = validateModuleContent(meta, {
      items: Array.from({ length: 7 }, () => validItem),
    });
    expect(tooMany.ok).toBe(false);
    const tooManyIssue = tooMany.issues.find(
      (i) => i.path.join(".") === "items" && /at most 6/.test(i.message),
    );
    expect(tooManyIssue).toBeDefined();

    // 2, 3, 6 items: accepted.
    expect(
      validateModuleContent(meta, { items: [validItem, validItem] }).ok,
    ).toBe(true);
    expect(
      validateModuleContent(meta, {
        items: [validItem, validItem, validItem],
      }).ok,
    ).toBe(true);
    expect(
      validateModuleContent(meta, {
        items: Array.from({ length: 6 }, () => validItem),
      }).ok,
    ).toBe(true);
  });
});
