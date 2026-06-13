import { describe, expect, it } from "vitest";
import { meta } from "../packages/framework/src/modules/services-grid/meta.js";
import { validateModuleContent } from "../packages/framework/src/modules/validate.js";

const validItem = { title: "X", body: "<p>x</p>" };

describe("UAT FC REQ-5: services-grid rejects item count outside 2..6", () => {
  it("rejects content with 1 item", () => {
    const result = validateModuleContent(meta, { items: [validItem] });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => /at least 2/.test(i.message))).toBe(true);
  });

  it("rejects content with 7 items", () => {
    const result = validateModuleContent(meta, {
      items: Array.from({ length: 7 }, () => validItem),
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => /at most 6/.test(i.message))).toBe(true);
  });

  it("accepts content at the boundaries (2 and 6 items)", () => {
    const two = validateModuleContent(meta, {
      items: [validItem, validItem],
    });
    expect(two.ok).toBe(true);

    const six = validateModuleContent(meta, {
      items: Array.from({ length: 6 }, () => validItem),
    });
    expect(six.ok).toBe(true);
  });
});
