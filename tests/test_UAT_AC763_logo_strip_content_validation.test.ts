import { describe, expect, it } from "vitest";
import { logoStripMeta, validateModuleContent } from "@gendev/framework";

const validImage = { id: "i1", src: "/assets/logo.png", alt: "Acme" };

/**
 * AC-763: Content validation for `logo-strip` enforces the items contract —
 * missing items, an empty items list, and an item without its required image
 * are all rejected (attributed to `items`); a single image-only item is the
 * minimal valid content; a fully-populated list (heading + up to 12 items with
 * label and href) is accepted with no issues.
 */
describe("UAT AC-763: logo-strip content validation rejects missing/empty items and items without an image", () => {
  it("test_UAT_AC763_rejects_missing_empty_and_imageless_items_accepts_valid", () => {
    // Missing items field → rejected, attributed to `items`.
    const missing = validateModuleContent(logoStripMeta, {});
    expect(missing.ok).toBe(false);
    expect(missing.issues.some((i) => i.path[0] === "items")).toBe(true);

    // Empty items list (below minimum of 1) → rejected, attributed to `items`.
    const empty = validateModuleContent(logoStripMeta, { items: [] });
    expect(empty.ok).toBe(false);
    expect(empty.issues.some((i) => i.path[0] === "items")).toBe(true);

    // An item missing its required image → rejected at the missing-image item.
    const noImage = validateModuleContent(logoStripMeta, {
      items: [{ label: "Acme" }],
    });
    expect(noImage.ok).toBe(false);
    expect(
      noImage.issues.some(
        (i) => i.path[0] === "items" && i.path[2] === "image",
      ),
    ).toBe(true);

    // Minimal valid content — a single item carrying only an image.
    const minimal = validateModuleContent(logoStripMeta, {
      items: [{ image: validImage }],
    });
    expect(minimal.ok).toBe(true);
    expect(minimal.issues).toEqual([]);

    // Fully-populated valid content — heading plus 12 items with optional
    // label and href, all well-formed.
    const items = Array.from({ length: 12 }, (_, n) => ({
      image: { ...validImage, id: `i${n}` },
      label: `Partner ${n}`,
      href: "https://acme.com",
    }));
    const full = validateModuleContent(logoStripMeta, {
      heading: "As seen in",
      items,
    });
    expect(full.ok).toBe(true);
    expect(full.issues).toEqual([]);
  });
});
