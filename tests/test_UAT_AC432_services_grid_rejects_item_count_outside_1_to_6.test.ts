import { describe, expect, it } from "vitest";
import { meta } from "../packages/framework/src/modules/services-grid/meta.js";
import { validateModuleContent } from "../packages/framework/src/modules/validate.js";

// v2 services-grid items require a `heading` (string) and `body` (markdown);
// the v1 `title` field no longer exists. Cardinality bound is 1..6.
const validItem = { heading: "X", body: "<p>x</p>" };

describe("UAT AC-432: services-grid rejects items array with cardinality outside 1..6", () => {
  it("test_UAT_AC432_services_grid_rejects_item_count_outside_1_to_6", () => {
    // 0 items (empty array): rejected, message names the min-of-1 bound,
    // path identifies the items field.
    const tooFew = validateModuleContent(meta, { items: [] });
    expect(tooFew.ok).toBe(false);
    const tooFewIssue = tooFew.issues.find(
      (i) => i.path.join(".") === "items" && /at least 1/.test(i.message),
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

    // 1 (one-col feature callout), 3, and 6 items: accepted.
    expect(validateModuleContent(meta, { items: [validItem] }).ok).toBe(true);
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
