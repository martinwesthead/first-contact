import { describe, expect, it } from "vitest";
import { splitSectionMeta, validateModuleContent } from "@gendev/framework";

const validImage = { id: "i1", src: "/assets/p.jpg", alt: "Photo" };

describe("UAT FC REQ-39: split-section content schema enforces required fields", () => {
  it("accepts the minimal valid content (image + heading + body)", () => {
    const result = validateModuleContent(splitSectionMeta, {
      image: validImage,
      heading: "H",
      body: "B",
    });
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it.each([
    ["image", { heading: "H", body: "B" }],
    ["heading", { image: validImage, body: "B" }],
    ["body", { image: validImage, heading: "H" }],
  ])("rejects content missing required field %s", (field, content) => {
    const result = validateModuleContent(splitSectionMeta, content);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.path[0] === field)).toBe(true);
  });

  it("accepts optional eyebrow and cta when well-formed", () => {
    const result = validateModuleContent(splitSectionMeta, {
      image: validImage,
      eyebrow: "Why us",
      heading: "H",
      body: "B",
      cta: { label: "Go", href: "https://example.com" },
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a cta missing its href", () => {
    const result = validateModuleContent(splitSectionMeta, {
      image: validImage,
      heading: "H",
      body: "B",
      cta: { label: "Go" },
    });
    expect(result.ok).toBe(false);
    expect(
      result.issues.some(
        (i) => i.path[0] === "cta" && i.path[1] === "href",
      ),
    ).toBe(true);
  });
});
