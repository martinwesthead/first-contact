import { describe, expect, it } from "vitest";
import { meta } from "../packages/framework/src/modules/services-grid/meta.js";
import { validateModuleContent } from "../packages/framework/src/modules/validate.js";

const validItem = { heading: "X", body: "<p>x</p>" };

describe("UAT FC REQ-5: services-grid rejects item count outside 1..6", () => {
  it("rejects content with 0 items", () => {
    const result = validateModuleContent(meta, { items: [] });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => /at least 1/.test(i.message))).toBe(true);
  });

  it("rejects content with 7 items", () => {
    const result = validateModuleContent(meta, {
      items: Array.from({ length: 7 }, () => validItem),
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => /at most 6/.test(i.message))).toBe(true);
  });

  it("accepts content at the boundaries (1 and 6 items)", () => {
    const one = validateModuleContent(meta, {
      items: [validItem],
    });
    expect(one.ok).toBe(true);

    const six = validateModuleContent(meta, {
      items: Array.from({ length: 6 }, () => validItem),
    });
    expect(six.ok).toBe(true);
  });
});
