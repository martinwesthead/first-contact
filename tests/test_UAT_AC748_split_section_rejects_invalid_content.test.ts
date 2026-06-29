import { describe, expect, it } from "vitest";
import { splitSectionMeta, validateModuleContent } from "@1stcontact/framework";

const validImage = { id: "i1", src: "/assets/p.jpg", alt: "Photo" };

// AC-748: omitting any one required field (image, heading, body) fails
// validation with an issue naming that field; a cta present but missing its
// required href fails with an issue identifying cta.href.
describe("UAT AC-748: content validation rejects missing required fields and malformed cta", () => {
  it("test_UAT_AC748_split_section_rejects_invalid_content", () => {
    // Each required field, omitted in turn, produces an issue naming that field.
    const missingCases: Array<[string, Record<string, unknown>]> = [
      ["image", { heading: "H", body: "B" }],
      ["heading", { image: validImage, body: "B" }],
      ["body", { image: validImage, heading: "H" }],
    ];
    for (const [field, content] of missingCases) {
      const result = validateModuleContent(splitSectionMeta, content);
      expect(result.ok).toBe(false);
      expect(result.issues.some((i) => i.path[0] === field)).toBe(true);
    }

    // A cta with a label but no href fails, with an issue identifying cta.href.
    const badCta = validateModuleContent(splitSectionMeta, {
      image: validImage,
      heading: "H",
      body: "B",
      cta: { label: "Go" },
    });
    expect(badCta.ok).toBe(false);
    expect(
      badCta.issues.some((i) => i.path[0] === "cta" && i.path[1] === "href"),
    ).toBe(true);
  });
});
