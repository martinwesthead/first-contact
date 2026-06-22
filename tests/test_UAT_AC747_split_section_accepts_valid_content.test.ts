import { describe, expect, it } from "vitest";
import { splitSectionMeta, validateModuleContent } from "@gendev/framework";

const validImage = { id: "i1", src: "/assets/p.jpg", alt: "Photo" };

// AC-747: validating content with the required image, heading, and body passes
// with no issues; adding a well-formed optional eyebrow and a complete cta
// (label + href) also passes.
describe("UAT AC-747: content validation accepts valid split-section content", () => {
  it("test_UAT_AC747_split_section_accepts_valid_content", () => {
    // Minimal valid content: image + heading + body.
    const minimal = validateModuleContent(splitSectionMeta, {
      image: validImage,
      heading: "H",
      body: "B",
    });
    expect(minimal.ok).toBe(true);
    expect(minimal.issues).toEqual([]);

    // Fuller content adding optional eyebrow and a complete cta.
    const fuller = validateModuleContent(splitSectionMeta, {
      image: validImage,
      eyebrow: "Why us",
      heading: "H",
      body: "B",
      cta: { label: "Go", href: "https://example.com" },
    });
    expect(fuller.ok).toBe(true);
    expect(fuller.issues).toEqual([]);
  });
});
