import { describe, expect, it } from "vitest";
import { servicesGridMeta, validateModuleContent } from "@1stcontact/framework";

const validImage = { id: "asset-1", src: "/assets/a.jpg", alt: "Card image" };

describe("UAT FC REQ-44: services-grid v2 item schema enforces required fields", () => {
  it("accepts an item with the required heading + body only", () => {
    const result = validateModuleContent(servicesGridMeta, {
      items: [{ heading: "H", body: "B" }],
    });
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("rejects an item missing the heading field", () => {
    const result = validateModuleContent(servicesGridMeta, {
      items: [{ body: "B" }],
    });
    expect(result.ok).toBe(false);
    expect(
      result.issues.some(
        (i) =>
          i.path[0] === "items" && i.path[1] === 0 && i.path[2] === "heading",
      ),
    ).toBe(true);
  });

  it("rejects an item missing the body field", () => {
    const result = validateModuleContent(servicesGridMeta, {
      items: [{ heading: "H" }],
    });
    expect(result.ok).toBe(false);
    expect(
      result.issues.some(
        (i) =>
          i.path[0] === "items" && i.path[1] === 0 && i.path[2] === "body",
      ),
    ).toBe(true);
  });

  it("accepts an optional image when shaped as an asset-ref object", () => {
    const result = validateModuleContent(servicesGridMeta, {
      items: [{ image: validImage, heading: "H", body: "B" }],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects an image given as a bare string (asset-ref only — no string fallback)", () => {
    const result = validateModuleContent(servicesGridMeta, {
      items: [{ image: "📦", heading: "H", body: "B" }],
    });
    expect(result.ok).toBe(false);
    expect(
      result.issues.some(
        (i) =>
          i.path[0] === "items" && i.path[1] === 0 && i.path[2] === "image",
      ),
    ).toBe(true);
  });

  it("accepts an optional cta when well-formed", () => {
    const result = validateModuleContent(servicesGridMeta, {
      items: [
        {
          heading: "H",
          body: "B",
          cta: { label: "Go", href: "https://example.com" },
        },
      ],
    });
    expect(result.ok).toBe(true);
  });
});
