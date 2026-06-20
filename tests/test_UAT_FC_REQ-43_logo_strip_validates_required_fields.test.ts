import { describe, expect, it } from "vitest";
import { logoStripMeta, validateModuleContent } from "@1stcontact/framework";

const validImage = { id: "i1", src: "/assets/logo.png", alt: "Acme" };

describe("UAT FC REQ-43: logo-strip content schema enforces required fields", () => {
  it("accepts the minimal valid content (one item with image only)", () => {
    const result = validateModuleContent(logoStripMeta, {
      items: [{ image: validImage }],
    });
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("rejects content missing items", () => {
    const result = validateModuleContent(logoStripMeta, {});
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.path[0] === "items")).toBe(true);
  });

  it("rejects an item missing image", () => {
    const result = validateModuleContent(logoStripMeta, {
      items: [{ label: "Acme" }],
    });
    expect(result.ok).toBe(false);
    expect(
      result.issues.some(
        (i) => i.path[0] === "items" && i.path[2] === "image",
      ),
    ).toBe(true);
  });

  it("accepts optional heading, label, and href when well-formed", () => {
    const result = validateModuleContent(logoStripMeta, {
      heading: "As seen in",
      items: [
        { image: validImage, label: "Acme", href: "https://acme.com" },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects an empty items list (min 1)", () => {
    const result = validateModuleContent(logoStripMeta, { items: [] });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.path[0] === "items")).toBe(true);
  });
});
