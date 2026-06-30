import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { REPRODUCING_A_WEBSITE_DOC } from "../apps/control-app/src/llm-context.js";

// The convert-flow LLM context documents the image-gallery imageSize dial so the
// convert step knows to set it. The guidance lives in two synced copies: the
// canonical how-to markdown and the byte-for-byte inlined mirror consumed at
// runtime. Both must mention the dial, name sm/md/lg, and tie the choice to how
// prominent images are in the source.
const here = dirname(fileURLToPath(import.meta.url));
const howtoPath = resolve(here, "../docs/llm-context/reproducing-a-website.md");

describe("UAT AC-774: convert-flow LLM context documents image-gallery imageSize", () => {
  it("test_UAT_AC774_convert_flow_doc_documents_image_gallery_imageSize", () => {
    const canonical = readFileSync(howtoPath, "utf-8");

    // Canonical doc: imageSize is documented in the image-gallery context, with
    // its values spelled out and tied to image prominence in the source.
    expect(canonical).toMatch(/image-gallery[\s\S]*imageSize/);
    expect(canonical).toMatch(/`sm`/);
    expect(canonical).toMatch(/`md`/);
    expect(canonical).toMatch(/`lg`/);
    expect(canonical).toMatch(/imageSize[\s\S]*prominent/);

    // Inlined runtime mirror stays in sync: it too mentions the imageSize dial
    // and its sm/md/lg values.
    expect(REPRODUCING_A_WEBSITE_DOC).toMatch(/image-gallery[\s\S]*imageSize/);
    expect(REPRODUCING_A_WEBSITE_DOC).toMatch(/`sm`/);
    expect(REPRODUCING_A_WEBSITE_DOC).toMatch(/`md`/);
    expect(REPRODUCING_A_WEBSITE_DOC).toMatch(/`lg`/);
    expect(REPRODUCING_A_WEBSITE_DOC).toMatch(/imageSize[\s\S]*prominent/);

    // The two copies carry the same image-gallery guidance line verbatim.
    const lineFrom = (src: string): string => {
      const m = /`image-gallery` populates[^\n]*/.exec(src);
      expect(m, "image-gallery guidance line present").not.toBeNull();
      return m![0];
    };
    expect(lineFrom(REPRODUCING_A_WEBSITE_DOC)).toBe(lineFrom(canonical));
  });
});
