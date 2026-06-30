import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { REPRODUCING_A_WEBSITE_DOC } from "../apps/control-app/src/llm-context.js";

// The convert-flow LLM context documents the services-grid item shape
// ({ heading, body, image?, cta? }), notes the optional image is an asset-ref
// object with no string fallback, and explains the section-level imageStyle dial
// (icon/cover/thumb) and the one-col variant for a single full-width feature
// callout. The guidance lives in two synced copies: the canonical how-to markdown
// and the byte-for-byte inlined mirror consumed at runtime.
const here = dirname(fileURLToPath(import.meta.url));
const howtoPath = resolve(here, "../docs/llm-context/reproducing-a-website.md");

function assertGuidance(src: string, label: string): void {
  // Item shape.
  expect(src, `${label}: item shape`).toMatch(
    /services-grid[\s\S]*\{ heading, body, image\?, cta\? \}/,
  );
  // Asset-ref-only image, no string fallback.
  expect(src, `${label}: asset-ref image`).toMatch(/`assetRef`/);
  expect(src, `${label}: no string fallback`).toMatch(/no string fallback/);
  // imageStyle dial and its values.
  expect(src, `${label}: imageStyle dial`).toMatch(/imageStyle/);
  expect(src, `${label}: icon value`).toMatch(/`icon`/);
  expect(src, `${label}: cover value`).toMatch(/`cover`/);
  expect(src, `${label}: thumb value`).toMatch(/`thumb`/);
  // one-col variant for a single full-width feature callout.
  expect(src, `${label}: one-col variant`).toMatch(/`one-col`/);
}

describe("UAT AC-778: convert-flow LLM context documents the services-grid item shape and imageStyle dial", () => {
  it("test_UAT_AC778_convert_flow_doc_documents_services_grid_item_shape_and_imageStyle", () => {
    const canonical = readFileSync(howtoPath, "utf-8");

    assertGuidance(canonical, "canonical how-to");
    assertGuidance(REPRODUCING_A_WEBSITE_DOC, "inlined runtime mirror");

    // The two copies carry the same services-grid guidance line verbatim.
    const lineFrom = (src: string): string => {
      const m = /`services-grid` populates[^\n]*/.exec(src);
      expect(m, "services-grid guidance line present").not.toBeNull();
      return m![0];
    };
    expect(lineFrom(REPRODUCING_A_WEBSITE_DOC)).toBe(lineFrom(canonical));
  });
});
