import { describe, expect, it } from "vitest";
import { validateSite } from "@1stcontact/site-schema";
import { makeMinimalSite } from "./_fixtures_REQ-3_site";

describe("UAT AC-400: ContentValue admits primitives, AssetRef, arrays, and plain objects", () => {
  it("test_UAT_AC400_content_value_admits_all_shapes", () => {
    const site = makeMinimalSite() as Record<string, unknown>;
    const pages = site.pages as Array<{ modules: Array<Record<string, unknown>> }>;

    pages[0].modules[0].content = {
      aString: "hello world",
      aNumber: 42,
      aBoolean: true,
      aNull: null,
      anAssetRef: {
        id: "img-1",
        src: "/assets/photo.jpg",
        alt: "Photo",
        focalPoint: { x: 0.5, y: 0.5 },
      },
      anArray: ["item-1", 2, false, null],
      aNestedObject: {
        nestedString: "nested",
        nestedNumber: 7,
        deeplyNested: {
          field: "value",
          list: ["a", "b", "c"],
        },
      },
      anArrayOfObjects: [
        { label: "Email", target: { kind: "email", value: "x@example.com" } },
        { label: "Phone", target: { kind: "tel", value: "+1-555-0100" } },
      ],
    };

    const result = validateSite(site);
    if (!result.ok) {
      console.error(JSON.stringify(result.errors, null, 2));
    }
    expect(result.ok).toBe(true);

    if (result.ok) {
      const content = result.value.pages[0].modules[0].content;
      expect(content).toBeDefined();
      expect((content as Record<string, unknown>).aString).toBe("hello world");
      expect((content as Record<string, unknown>).aNumber).toBe(42);
      expect((content as Record<string, unknown>).aBoolean).toBe(true);
      expect((content as Record<string, unknown>).aNull).toBeNull();
      expect(Array.isArray((content as Record<string, unknown>).anArray)).toBe(true);
      expect(typeof (content as Record<string, unknown>).aNestedObject).toBe("object");
    }
  });
});
