import { describe, expect, it } from "vitest";
import { bannerMeta } from "@1stcontact/framework";

// AC-756: the banner content contract marks heading as required (string) and
// eyebrow (string), subhead (markdown), and cta (object of label + href) as
// optional. subhead is declared markdown so inline emphasis/links are supported,
// consistent with the hero subhead.
describe("UAT AC-756: banner content contract requires heading; others optional", () => {
  it("test_UAT_AC756_banner_content_contract_requires_heading_others_optional", () => {
    const schema = bannerMeta.contentSchema;

    // heading: required string.
    expect(schema.heading.required).toBe(true);
    expect(schema.heading.type).toBe("string");

    // eyebrow: optional string.
    expect(schema.eyebrow.required).toBe(false);
    expect(schema.eyebrow.type).toBe("string");

    // subhead: optional markdown (so inline formatting is carried through).
    expect(schema.subhead.required).toBe(false);
    expect(schema.subhead.type).toBe("markdown");

    // cta: optional object of label (string, required) + href (url, required).
    expect(schema.cta.required).toBe(false);
    const ctaType = schema.cta.type as {
      kind: string;
      fields: Record<string, { type: string; required: boolean }>;
    };
    expect(ctaType.kind).toBe("object");
    expect(ctaType.fields.label.type).toBe("string");
    expect(ctaType.fields.label.required).toBe(true);
    expect(ctaType.fields.href.type).toBe("url");
    expect(ctaType.fields.href.required).toBe(true);
  });
});
