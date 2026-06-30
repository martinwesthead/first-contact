import { describe, expect, it } from "vitest";
import { servicesGridMeta, validateModuleContent } from "@1stcontact/framework";

// A services-grid item requires a `heading` (string) and a `body` (markdown),
// with an optional `image` that must be an asset-ref object (no bare-string
// fallback) and an optional `cta` {label, href}. Validation rejects a bare-string
// image, a missing heading, and a missing body, each with a violation path that
// identifies the offending item field; well-formed items are accepted.
const validImage = { id: "asset-1", src: "/assets/a.jpg", alt: "Card image" };

function hasItemFieldIssue(
  result: ReturnType<typeof validateModuleContent>,
  field: string,
): boolean {
  return result.issues.some(
    (i) => i.path[0] === "items" && i.path[1] === 0 && i.path[2] === field,
  );
}

describe("UAT AC-776: services-grid item schema requires heading + body, optional asset-ref image + cta", () => {
  it("test_UAT_AC776_services_grid_item_schema_requires_heading_body_optional_image_cta", () => {
    // Accept: heading + body only.
    expect(
      validateModuleContent(servicesGridMeta, {
        items: [{ heading: "H", body: "B" }],
      }).ok,
    ).toBe(true);

    // Accept: heading + body + asset-ref image.
    expect(
      validateModuleContent(servicesGridMeta, {
        items: [{ image: validImage, heading: "H", body: "B" }],
      }).ok,
    ).toBe(true);

    // Accept: heading + body + well-formed {label, href} cta.
    expect(
      validateModuleContent(servicesGridMeta, {
        items: [
          {
            heading: "H",
            body: "B",
            cta: { label: "Go", href: "https://example.com" },
          },
        ],
      }).ok,
    ).toBe(true);

    // Reject: image given as a bare string (asset-ref only — no string fallback).
    const stringImage = validateModuleContent(servicesGridMeta, {
      items: [{ image: "/assets/a.jpg", heading: "H", body: "B" }],
    });
    expect(stringImage.ok).toBe(false);
    expect(hasItemFieldIssue(stringImage, "image")).toBe(true);

    // Reject: item missing its heading.
    const noHeading = validateModuleContent(servicesGridMeta, {
      items: [{ body: "B" }],
    });
    expect(noHeading.ok).toBe(false);
    expect(hasItemFieldIssue(noHeading, "heading")).toBe(true);

    // Reject: item missing its body.
    const noBody = validateModuleContent(servicesGridMeta, {
      items: [{ heading: "H" }],
    });
    expect(noBody.ok).toBe(false);
    expect(hasItemFieldIssue(noBody, "body")).toBe(true);
  });
});
